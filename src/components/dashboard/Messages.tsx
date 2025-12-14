"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

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
    } catch { }
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
          router.replace(`/login?redirect_url=/dashboard`);
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
              // Update URL without full navigation since we're in dashboard
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.set('to', other);
              window.history.replaceState({}, '', newUrl.toString());
              // Trigger re-render by updating targetId
              window.location.reload();
              return;
            }
          } catch { }
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
            const map: Record<string, { name: string | null; avatar_url: string | null }> = {};
            (profs ?? []).forEach((pp: any) => { map[pp.id] = { name: pp.name ?? null, avatar_url: pp.avatar_url ?? null }; });
            setConversations(partners.map(p => ({ otherId: p.otherId, lastAt: p.lastAt, name: map[p.otherId]?.name ?? null, avatar_url: map[p.otherId]?.avatar_url ?? null })));
          } else {
            setConversations([]);
          }
        } catch { }
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
          } catch { }
        }, 4000);
      } catch (e) {
        console.debug(e);
      }
    })();
    return () => {
      cancelled = true;
      try { if (channel) supabase.removeChannel(channel); } catch { }
      try { if (poll) window.clearInterval(poll); } catch { }
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

  const handleConversationSelect = (otherId: string) => {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('to', otherId);
    window.history.replaceState({}, '', newUrl.toString());
    window.location.reload();
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar: Conversations List */}
      <div className="w-80 shrink-0 flex flex-col bg-background/60 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-xl overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-white/5 bg-white/5">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <input
              className="w-full h-10 pl-10 pr-4 rounded-full bg-background/50 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
              placeholder="Buscar conversación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-muted-foreground/10">
          {conversations
            .filter(c => !search || (c.name ?? '').toLowerCase().includes(search.toLowerCase()))
            .map((c) => {
              const isActive = c.otherId === targetId;
              return (
                <button
                  key={c.otherId}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-left group ${isActive
                      ? 'bg-primary/10 shadow-sm border border-primary/20'
                      : 'hover:bg-white/5 border border-transparent'
                    }`}
                  onClick={() => handleConversationSelect(c.otherId)}
                >
                  <div className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 ${isActive ? 'border-primary/20' : 'border-transparent group-hover:border-white/20'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.name ?? 'Usuario'} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center text-muted-foreground font-bold">
                        {c.name?.[0] || '?'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                        {c.name ?? 'Usuario'}
                      </span>
                      <span className={`text-[10px] ${isActive ? 'text-primary/70' : 'text-muted-foreground/70'}`}>
                        {new Date(c.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`text-xs truncate ${isActive ? 'text-primary/60' : 'text-muted-foreground'}`}>
                      Ver conversación
                    </div>
                  </div>
                </button>
              )
            })}
          {conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground p-4">
              <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
              </div>
              <p className="text-xs">Sin conversaciones</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Pane */}
      <div className="flex-1 flex flex-col bg-background/60 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-xl overflow-hidden relative">
        {/* Chat Header */}
        <div className="h-16 px-6 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 text-primary-foreground bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">
                {target?.name ?? "Mensajes"}
              </h3>
              {targetId && (
                <Link href={`/profile/${targetId}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                  Ver perfil <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden relative">
          {/* Decorative Background Pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>

          <div className="absolute inset-0 flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-red-500 bg-red-500/5">
                <p>{error}</p>
              </div>
            ) : !targetId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </div>
                <h3 className="text-lg font-serif">Selecciona una conversación</h3>
                <p className="text-sm text-muted-foreground max-w-xs mt-2">Elige un contacto de la barra lateral para comenzar a chatear.</p>
              </div>
            ) : (
              <>
                <div ref={listRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-muted-foreground/10">
                  {messages.map((m, i) => {
                    const mine = m.sender_id === me;
                    return (
                      <div key={m.id} className={`flex w-full ${mine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300 fill-mode-backwards`} style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className={`max-w-[70%] relative group`}>
                          <div className={`px-5 py-3 rounded-[1.25rem] shadow-sm text-sm leading-relaxed ${mine
                              ? 'bg-primary text-primary-foreground rounded-br-none shadow-primary/20'
                              : 'bg-white/80 dark:bg-white/10 text-foreground rounded-bl-none border border-border/40'
                            }`}>
                            <div className="whitespace-pre-wrap break-words">{m.content}</div>
                          </div>
                          <div className={`text-[10px] mt-1 opacity-60 flex items-center gap-1 ${mine ? 'justify-end px-1' : 'px-1'}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {mine && (
                              <span className={m.read_at ? "text-blue-400" : ""}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                      <p className="text-sm">Envía un mensaje para comenzar...</p>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white/5 border-t border-white/5 backdrop-blur-md">
                  <div className="flex items-end gap-3 max-w-4xl mx-auto">
                    <div className="flex-1 bg-background/50 border border-white/10 rounded-[1.5rem] shadow-inner focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
                      <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                        placeholder="Escribe tu mensaje..."
                        className="w-full bg-transparent px-5 py-3.5 max-h-32 min-h-[50px] outline-none text-sm placeholder:text-muted-foreground/50 resize-none overflow-hidden"
                        autoComplete="off"
                      />
                    </div>
                    <Button
                      onClick={onSend}
                      disabled={!canSend}
                      size="icon"
                      className="h-12 w-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 flex-shrink-0 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MessagesSection() {
  return (
    <Suspense fallback={<div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">Cargando…</div>}>
      <MessagesContent />
    </Suspense>
  );
}