"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search, MessageSquare, X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";

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
  const [conversations, setConversations] = useState<Array<{ 
    otherId: string; 
    name: string | null; 
    avatar_url: string | null; 
    lastAt: string;
    lastMessage: string;
    lastMessageId: string;
  }>>([]);
  // Use a ref instead of state for mobile detection to avoid hydration issues
  const [showConversations, setShowConversations] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    try {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    } catch {}
  }, [messages.length]);

  // Set initial state for mobile view
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
    };
    
    // Initial check
    checkIsMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Handle responsive view changes when targetId changes
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      // On mobile, show conversation list first when there's no targetId
      // When there is a targetId on mobile, hide conversation list (show chat)
      setShowConversations(mobile ? !targetId : true);
    };
    
    checkIsMobile();
  }, [targetId]);

  // Initialize session and load conversations
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
        
        // Load recent conversations (partners + last message time + last message content)
        // This should load regardless of whether there's a targetId
        const loadConversations = async () => {
          try {
            // First, get all messages (sent and received) ordered by creation time
            const { data: allMessages } = await supabase
              .from('messages')
              .select('id, sender_id, recipient_id, content, created_at')
              .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
              .order('created_at', { ascending: false });
            
            // Group messages by conversation partner and get the latest message for each
            const conversationsMap: Record<string, { 
              otherId: string; 
              lastAt: string; 
              lastMessage: string;
              lastMessageId: string;
            }> = {};
            
            (allMessages ?? []).forEach((message: any) => {
              const otherId = message.sender_id === uid ? message.recipient_id : message.sender_id;
              // Only keep the most recent message for each conversation
              if (!conversationsMap[otherId]) {
                conversationsMap[otherId] = {
                  otherId,
                  lastAt: message.created_at,
                  lastMessage: message.content,
                  lastMessageId: message.id
                };
              }
            });
            
            // Convert to array
            const conversationsList = Object.values(conversationsMap);
            
            if (conversationsList.length > 0) {
              const { data: profs } = await supabase
                .from('public_profiles')
                .select('id,name,avatar_url')
                .in('id', conversationsList.map(c => c.otherId));
                
              const profileMap: Record<string, { name: string|null; avatar_url: string|null }> = {};
              (profs ?? []).forEach((pp: any) => { 
                profileMap[pp.id] = { name: pp.name ?? null, avatar_url: pp.avatar_url ?? null }; 
              });
              
              if (active) {
                setConversations(conversationsList.map(c => ({
                  otherId: c.otherId,
                  lastAt: c.lastAt,
                  lastMessage: c.lastMessage,
                  lastMessageId: c.lastMessageId,
                  name: profileMap[c.otherId]?.name ?? null,
                  avatar_url: profileMap[c.otherId]?.avatar_url ?? null
                })));
              }
            } else {
              if (active) setConversations([]);
            }
          } catch (error) {
            console.error('Error loading conversations:', error);
          }
        };
        
        // Initial load of conversations
        await loadConversations();
        
        // Handle targetId logic after conversations are loaded
        if (!targetId) {
          // Only auto-pick latest conversation partner on desktop, not mobile
          if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            // Auto-pick latest conversation partner (desktop only)
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
          }
          // On mobile, show conversation list first
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
        // Ensure the target user profile is loaded
        const { data: targetProfile } = await supabase
          .from("public_profiles")
          .select("id,name,avatar_url")
          .eq("id", targetId)
          .maybeSingle();
        
        if (!cancelled && targetProfile) {
          setTarget({ 
            id: targetProfile.id, 
            name: targetProfile.name ?? null, 
            avatar_url: targetProfile.avatar_url ?? null 
          });
        }

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

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!me) return;
    
    const channel = supabase
      .channel('messages-conversations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // When a new message is inserted, update the conversations list
          const newMessage = payload.new as any;
          const isParticipant = newMessage.sender_id === me || newMessage.recipient_id === me;
          
          if (isParticipant) {
            // Update conversations list with the new message
            setConversations(prev => {
              const otherId = newMessage.sender_id === me ? newMessage.recipient_id : newMessage.sender_id;
              const existingConversation = prev.find(c => c.otherId === otherId);
              
              if (existingConversation) {
                // Update existing conversation with new message
                return prev.map(c => 
                  c.otherId === otherId 
                    ? { ...c, lastAt: newMessage.created_at, lastMessage: newMessage.content, lastMessageId: newMessage.id }
                    : c
                ).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
              } else {
                // Add new conversation
                return [
                  {
                    otherId,
                    lastAt: newMessage.created_at,
                    lastMessage: newMessage.content,
                    lastMessageId: newMessage.id,
                    name: null,
                    avatar_url: null
                  },
                  ...prev
                ];
              }
            });
            
            // If this is a new conversation partner, fetch their profile
            const otherId = newMessage.sender_id === me ? newMessage.recipient_id : newMessage.sender_id;
            
            // Fetch profile for new conversation partner
            supabase
              .from('public_profiles')
              .select('name, avatar_url')
              .eq('id', otherId)
              .single()
              .then(({ data, error }) => {
                if (!error && data) {
                  setConversations(prev => 
                    prev.map(c => 
                      c.otherId === otherId 
                        ? { ...c, name: data.name ?? null, avatar_url: data.avatar_url ?? null }
                        : c
                    )
                  );
                }
              });
          }
        }
      )
      .subscribe();
    
    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, supabase]);

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

  // Handle mobile view logic with proper state management
  const toggleConversationView = () => {
    if (isMobileView) {
      // On mobile, if we're viewing a chat, go back to conversation list
      // If we're on conversation list, go to main page
      if (targetId) {
        router.push("/messages");
      } else {
        router.push("/main");
      }
    }
  };

  // Determine back button destination
  const backButtonDestination = () => {
    if (isMobileView && targetId) {
      // If on mobile and in a conversation, go back to conversation list
      return () => router.push("/messages");
    } else {
      // Otherwise go to main page
      return () => router.push("/main");
    }
  };

  // Show conversation list on mobile when appropriate, always show on desktop
  const showConversationList = isMobileView ? !targetId : true;
  // Show chat window when there's a targetId
  const showChatWindow = !!targetId;

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-4 mobile-bottom-safe">
      {/* Mobile Header - visible only on mobile/tablet */}
      <DetailBackButton className="lg:hidden mb-4">
        <div className="flex items-center justify-between w-full">
          {/* Back Button */}
          <Button 
            onClick={backButtonDestination()}
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 w-8 h-8 border border-border/30 hover:border-border/50 transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {/* Center Title */}
          <h1 className="text-base font-medium text-foreground truncate mx-2">
            Chat
          </h1>
          
          {/* Spacer for alignment */}
          <div className="w-8 h-8" />
        </div>
      </DetailBackButton>
      
      {/* Desktop: Show original content without changes */}
      <div className="hidden lg:block">
        {/* This empty div ensures desktop version remains unchanged */}
      </div>

      <div className="flex gap-4">
        {/* Sidebar - always visible on desktop, toggleable on mobile */}
        <div className={cn(
          "w-80 shrink-0",
          isMobileView ? (targetId ? "hidden lg:block" : "block") : "block"
        )}>
          <div className="p-4">
            <div className="flex w-full items-center gap-2 rounded-xl border bg-muted px-3 py-2">
              <Search className="text-emerald-600" />
              <input
                className="h-9 flex-1 bg-transparent outline-none text-sm"
                placeholder="Buscar"
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1 px-2">
            {conversations
              .filter(c => !search || (c.name ?? '').toLowerCase().includes(search.toLowerCase()))
              .map((c) => (
                <button
                  key={c.otherId}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/60 text-left ${c.otherId===targetId ? 'bg-muted/60' : ''}`}
                  onClick={() => {
                    router.push(`/messages?to=${c.otherId}`);
                  }}
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.avatar_url ? <img src={c.avatar_url} alt={c.name ?? 'Usuario'} className="h-full w-full object-cover"/> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{c.name ?? 'Usuario'}</div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground truncate max-w-[70%]" title={c.lastMessage}>
                        {c.lastMessage ? (c.lastMessage.length > 30 ? c.lastMessage.substring(0, 30) + '...' : c.lastMessage) : 'No messages yet'}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(c.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </button>
            ))}
            {conversations.length===0 && (
              <div className="px-3 py-6 text-sm text-muted-foreground">No hay conversaciones recientes.</div>
            )}
          </div>
        </div>

        {/* Chat pane */}
        <Card className={cn(
          "flex-1 rounded-2xl border shadow-md",
          targetId ? "flex" : "hidden lg:flex" // Hide on mobile when conversation list is shown
        )}>
          <CardHeader className="px-6">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isMobileView && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={toggleConversationView}
                    className="h-8 w-8 p-0 md:hidden"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
                <span>Mensajes</span>
              </div>
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
              <div className="rounded-md border border-destructive/550 bg-destructive/10 p-6 text-sm text-destructive">{error}</div>
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