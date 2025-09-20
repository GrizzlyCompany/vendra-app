
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

// 1:1 chat page. Open with /messages?to=<userId>
function MessagesContent() {
  const router = useRouter();
  const params = useSearchParams();
  const targetId = params.get("to");

  const [me, setMe] = useState<string | null>(null);
  const [target, setTarget] = useState<{ id: string; name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Array<{ id: string; sender_id: string; recipient_id: string; content: string; created_at: string; read_at: string | null }>>([]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Array<{ otherId: string; name: string | null; avatar_url: string | null; lastAt: string }>>([]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    try {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    } catch {}
  }, [messages.length]);

  // Initialize session and load target
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id ?? null;
        if (!uid) {
          router.replace(`/login?redirect_url=/messages${targetId ? `?to=${targetId}` : ""}`);
          return;
        }
        if (!active) return;
        setMe(uid);
        if (!targetId) {
          // Auto-pick latest conversation partner
          try {
            const { data: last } = await supabase
              .from('messages')
              .select('sender_id,recipient_id,created_at')
              .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            const other = last ? (last.sender_id === uid ? last.recipient_id : last.sender_id) : null;
            if (other) {
              router.replace(`/messages?to=${other}`);
              return;
            }
          } catch {}
          setLoading(false);
          return;
        }

        // Load target minimal public profile
        const { data: p } = await supabase
          .from("public_profiles")
          .select("id,name,avatar_url")
          .eq("id", targetId)
          .maybeSingle();
        if (active) setTarget(p ? { id: p.id, name: p.name ?? null, avatar_url: p.avatar_url ?? null } : { id: targetId, name: null, avatar_url: null });

        // Load recent conversations (partners + last message time)
        try {
          const { data: recentMsgs } = await supabase
            .from('messages')
            .select('sender_id,recipient_id,created_at')
            .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
            .order('created_at', { ascending: false })
            .limit(100);
          const seen = new Set<string>();
          const partners: Array<{ otherId: string; lastAt: string }> = [];
          (recentMsgs ?? []).forEach((m: any) => {
            const other = m.sender_id === uid ? m.recipient_id : m.sender_id;
            if (!seen.has(other)) {
              seen.add(other);
              partners.push({ otherId: other, lastAt: m.created_at });
            }
          });
          if (partners.length > 0) {
            const { data: profs } = await supabase
              .from('public_profiles')
              .select('id,name,avatar_url')
              .in('id', partners.map(p => p.otherId));
            const map: Record<string, { name: string|null; avatar_url: string|null }> = {};
            (profs ?? []).forEach((pp: any) => { map[pp.id] = { name: pp.name ?? null, avatar_url: pp.avatar_url ?? null }; });
            setConversations(partners.map(p => ({ otherId: p.otherId, lastAt: p.lastAt, name: map[p.otherId]?.name ?? null, avatar_url: map[p.otherId]?.avatar_url ?? null })));
          } else {
            setConversations([]);
          }
        } catch {}
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? String(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router, targetId]);

  // Load thread and subscribe
  useEffect(() => {
    if (!me || !targetId) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let poll: number | null = null;
    (async () => {
      try {
        // Initial fetch (thread both directions)
        const { data, error } = await supabase
          .from("messages")
          .select("id,sender_id,recipient_id,content,created_at,read_at")
          .in('sender_id', [me, targetId])
          .in('recipient_id', [me, targetId])
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (cancelled) return;
        setMessages((data ?? []) as any);

        // Mark as read for messages to me from target
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("recipient_id", me)
          .eq("sender_id", targetId)
          .is("read_at", null);

        // Realtime subscription for new messages for this pair
        channel = supabase
          .channel(`messages-thread-${me}-${targetId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'messages' },
            (payload: any) => {
              const m = (payload.new || payload.old) as any;
              if (!m) return;
              const inThread = (m.sender_id === me && m.recipient_id === targetId) || (m.sender_id === targetId && m.recipient_id === me);
              if (!inThread) return;
              if (payload.eventType === 'INSERT') {
                setMessages((prev) => [...prev, payload.new as any]);
                if ((payload.new as any).recipient_id === me) {
                  supabase
                    .from('messages')
                    .update({ read_at: new Date().toISOString() })
                    .eq('id', (payload.new as any).id)
                    .is('read_at', null);
                }
              } else if (payload.eventType === 'UPDATE') {
                setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
              }
            }
          )
          .subscribe();

        // Polling fallback every 4s in case realtime is not enabled
        poll = window.setInterval(async () => {
          try {
            const { data } = await supabase
              .from('messages')
              .select('id,sender_id,recipient_id,content,created_at,read_at')
              .in('sender_id', [me, targetId])
              .in('recipient_id', [me, targetId])
              .order('created_at', { ascending: true });
            if (!data) return;
            setMessages((data as any));
          } catch {}
        }, 4000);
      } catch (e) {
        console.debug(e);
      }
    })();
    return () => {
      cancelled = true;
      try { if (channel) supabase.removeChannel(channel); } catch {}
      try { if (poll) window.clearInterval(poll); } catch {}
    };
  }, [me, targetId]);

  const canSend = useMemo(() => me && targetId && text.trim().length > 0, [me, targetId, text]);

  const onSend = async () => {
    if (!canSend) return;
    const payload = { sender_id: me!, recipient_id: targetId!, content: text.trim() };
    setText("");
    try {
      const { data, error } = await supabase.from("messages").insert(payload).select("id, sender_id, recipient_id, content, created_at, read_at").single();
      if (error) throw error;
      if (data) {
        // Optimistic append in case realtime is delayed
        setMessages((prev) => [...prev, data as any]);
      }
    } catch (e: any) {
      alert(e?.message ?? String(e));
    }
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6">
      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-80 shrink-0">
          <div className="px-2 py-2">
            <div className="flex w-full items-center gap-2 rounded-xl border bg-muted px-3 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
              <input
                className="h-9 flex-1 bg-transparent outline-none text-sm"
                placeholder="Buscar"
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            {conversations
              .filter(c => !search || (c.name ?? '').toLowerCase().includes(search.toLowerCase()))
              .map((c) => (
                <button
                  key={c.otherId}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/60 text-left ${c.otherId===targetId ? 'bg-muted/60' : ''}`}
                  onClick={()=>router.push(`/messages?to=${c.otherId}`)}
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.avatar_url ? <img src={c.avatar_url} alt={c.name ?? 'Usuario'} className="h-full w-full object-cover"/> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{c.name ?? 'Usuario'}</div>
                    <div className="text-xs text-muted-foreground">{new Date(c.lastAt).toLocaleString()}</div>
                  </div>
                </button>
            ))}
            {conversations.length===0 && (
              <div className="px-3 py-6 text-sm text-muted-foreground">No hay conversaciones recientes.</div>
            )}
          </div>
        </div>

        {/* Chat pane */}
        <Card className="flex-1 rounded-2xl border shadow-md">
          <CardHeader className="px-6">
            <CardTitle className="flex items-center justify-between">
              <span>Mensajes</span>
              {targetId ? (
                <span className="text-sm text-muted-foreground">
                  Conversación con {target?.name ?? 'Usuario'} · <Link href={`/profile/${targetId}`} className="underline">ver perfil</Link>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Selecciona un usuario para chatear</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            {loading ? (
              <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">Cargando…</div>
            ) : error ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-sm text-destructive">{error}</div>
            ) : !targetId ? (
              <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">No hay conversación seleccionada. Abre un perfil y pulsa “Chat”.</div>
            ) : (
              <div className="flex h-[60vh] flex-col">
                <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {messages.map((m) => {
                    const mine = m.sender_id === me;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm shadow ${mine ? 'bg-emerald-600 text-white' : 'bg-muted text-foreground'}`}>
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                          <div className="mt-1 text-[10px] opacity-70 text-right">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {mine && (<span className="ml-2">{m.read_at ? '✓✓' : '✓'}</span>)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground mt-10">Aún no hay mensajes. ¡Envía el primero!</div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                    placeholder="Escribe tu mensaje…"
                    className="rounded-full"
                  />
                  <Button onClick={onSend} disabled={!canSend} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">Enviar</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<main className="container mx-auto max-w-6xl px-4 py-6"><div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">Cargando…</div></main>}>
      <MessagesContent />
    </Suspense>
  );
}
