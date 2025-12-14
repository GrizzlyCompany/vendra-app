"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search, ChevronLeft, Menu, AlertCircle } from "lucide-react";
import { useKeyboardVisibility } from "@/hooks/useKeyboardVisibility";
import { motion, AnimatePresence } from "framer-motion";
import { ConversationList } from "@/features/messaging/components/ConversationList";
import { MessageItem } from "@/features/messaging/components/MessageItem";
import { ChatView } from "@/features/messaging/components/ChatView";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  conversation_type?: string;
  case_status?: string;
  closed_at?: string;
  closed_by?: string;
}

interface Conversation {
  otherId: string;
  name: string | null;
  avatar_url: string | null;
  lastAt: string;
  lastMessage: string;
  lastMessageId: string;
}

interface SupabasePayload {
  new?: Message;
  old?: Message;
  eventType: string;
}

// 1:1 chat page. Open with /messages?to=<userId>
function MessagesContent() {
  const router = useRouter();
  const params = useSearchParams();
  const targetId = params.get("to");
  const isKeyboardVisible = useKeyboardVisibility();

  const [me, setMe] = useState<string | null>(null);
  const [target, setTarget] = useState<{ id: string; name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showConversationList, setShowConversationList] = useState(false); // Default to false
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isClosedConversation, setIsClosedConversation] = useState(false);
  const prevMessagesLength = useRef(messages.length); // Track previous message count
  const isInitialLoad = useRef(true); // Track initial load
  const lastMessageId = useRef<string | null>(null); // Track the ID of the last message
  const wasKeyboardVisible = useRef(false); // Track keyboard state changes

  // Auto scroll to bottom when NEW messages are added
  useEffect(() => {
    // Skip scroll on initial load
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      prevMessagesLength.current = messages.length;
      // Update last message ID if there are messages
      if (messages.length > 0) {
        lastMessageId.current = messages[messages.length - 1].id;
      }
      return;
    }

    // Check if we actually have new messages (not just a re-render)
    const hasNewMessages = messages.length > prevMessagesLength.current;
    const actualLastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
    const lastMessageChanged = actualLastMessageId !== lastMessageId.current;

    // Only scroll to bottom if we have new messages or the last message changed
    if ((hasNewMessages || lastMessageChanged) && listRef.current) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        }
      });
    }

    // Update tracking variables
    prevMessagesLength.current = messages.length;
    lastMessageId.current = actualLastMessageId;
  }, [messages]);

  // Set initial state for mobile view
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      // Only set initial showConversationList state if we're on mobile and don't have a targetId
      if (mobile && !targetId) {
        setShowConversationList(true);
      }
    };

    // Initial check
    checkIsMobile();

    // Add resize listener
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, [targetId]); // Add targetId as dependency

  // Effect to handle mobile view state when targetId changes
  useEffect(() => {
    if (isMobileView) {
      // If we have a targetId, show the chat view
      // If we don't have a targetId, show the conversation list
      setShowConversationList(!targetId);
    }
  }, [isMobileView, targetId]);

  // Handle keyboard visibility changes without affecting navigation
  useEffect(() => {
    // Only update state if this is a genuine keyboard visibility change
    // and we're not already in the process of navigating
    if (wasKeyboardVisible.current !== isKeyboardVisible) {
      wasKeyboardVisible.current = isKeyboardVisible;

      // Don't change the view state when keyboard visibility changes
      // Just handle scrolling if needed
      if (listRef.current && (isKeyboardVisible || isInputFocused)) {
        // When keyboard opens or input is focused, scroll to bottom of messages
        requestAnimationFrame(() => {
          if (listRef.current) {
            listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
          }
        });
      }
    }
  }, [isKeyboardVisible, isInputFocused]);

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

            (allMessages ?? []).forEach((message) => {
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

              const profileMap: Record<string, { name: string | null; avatar_url: string | null }> = {};
              (profs ?? []).forEach((pp) => {
                profileMap[pp.id] = { name: pp.name ?? null, avatar_url: pp.avatar_url ?? null };
              });

              if (active) {
                // Only update conversations if they've actually changed
                setConversations(prevConversations => {
                  // Convert both arrays to JSON strings for comparison
                  const prevConversationsStr = JSON.stringify(prevConversations.map(c => ({
                    otherId: c.otherId,
                    lastAt: c.lastAt,
                    lastMessage: c.lastMessage,
                    lastMessageId: c.lastMessageId,
                    name: c.name,
                    avatar_url: c.avatar_url
                  })).sort((a, b) => a.otherId.localeCompare(b.otherId)));

                  const newConversationsStr = JSON.stringify(conversationsList.map(c => ({
                    otherId: c.otherId,
                    lastAt: c.lastAt,
                    lastMessage: c.lastMessage,
                    lastMessageId: c.lastMessageId,
                    name: profileMap[c.otherId]?.name ?? null,
                    avatar_url: profileMap[c.otherId]?.avatar_url ?? null
                  })).sort((a, b) => a.otherId.localeCompare(b.otherId)));

                  // Only update if conversations have actually changed
                  if (prevConversationsStr !== newConversationsStr) {
                    return conversationsList.map(c => ({
                      otherId: c.otherId,
                      lastAt: c.lastAt,
                      lastMessage: c.lastMessage,
                      lastMessageId: c.lastMessageId,
                      name: profileMap[c.otherId]?.name ?? null,
                      avatar_url: profileMap[c.otherId]?.avatar_url ?? null
                    }));
                  }
                  return prevConversations;
                });
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
            } catch { }
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

        // Check if this is a closed admin conversation
        // Assuming admin email is admin@vendra.com, we'll get admin profile to get their ID
        let adminUserId = null;
        try {
          // Try to get admin profile instead of user record
          const { data: adminProfile } = await supabase
            .from('public_profiles')
            .select('id')
            .eq('email', 'admin@vendra.com')
            .single();

          if (adminProfile) {
            adminUserId = adminProfile.id;
          }
        } catch (error) {
          console.warn('Could not fetch admin profile:', error);
        }

        if (adminUserId && (uid === targetId || adminUserId === targetId)) {
          // This is an admin conversation (user chatting with admin)
          const { data: conversationMessages } = await supabase
            .from('messages')
            .select('case_status')
            .or(`and(sender_id.eq.${uid},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${uid})`)
            .eq('conversation_type', 'user_to_admin')
            .order('created_at', { ascending: false })
            .limit(1);

          if (active && conversationMessages && conversationMessages.length > 0) {
            const isClosed = conversationMessages[0].case_status === 'closed';
            console.log('Checking conversation status:', {
              conversationMessages: conversationMessages[0],
              isClosed,
              uid,
              targetId,
              adminId: adminUserId
            });
            setIsClosedConversation(isClosed);
          } else if (active) {
            console.log('No conversation messages found for admin conversation');
            setIsClosedConversation(false);
          }
        } else {
          if (active) setIsClosedConversation(false);
        }

      } catch (e: unknown) {
        if (!active) return;
        setError(e instanceof Error ? e.message : String(e));
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
        // Reset initial load flag and tracking variables when switching conversations
        isInitialLoad.current = true;
        prevMessagesLength.current = 0;
        lastMessageId.current = null;

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
        setMessages((data ?? []) as Message[]);

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
              const m = (payload.new || payload.old);
              if (!m) return;
              const inThread = (m.sender_id === me && m.recipient_id === targetId) || (m.sender_id === targetId && m.recipient_id === me);
              if (!inThread) return;
              if (payload.eventType === 'INSERT') {
                setMessages((prev) => {
                  // Check if message already exists to prevent duplicates
                  const messageExists = prev.some(msg => msg.id === payload.new!.id);
                  if (messageExists) {
                    return prev;
                  }
                  return [...prev, payload.new as Message];
                });
                if ((payload.new as Message).recipient_id === me) {
                  supabase
                    .from('messages')
                    .update({ read_at: new Date().toISOString() })
                    .eq('id', (payload.new as Message).id)
                    .is('read_at', null);
                }
              } else if (payload.eventType === 'UPDATE') {
                setMessages((prev) => {
                  // Only update if something actually changed
                  const existingMessage = prev.find(msg => msg.id === payload.new!.id);
                  if (existingMessage) {
                    // Check if anything actually changed
                    const hasChanges =
                      existingMessage.read_at !== payload.new!.read_at ||
                      existingMessage.content !== payload.new!.content;

                    if (hasChanges) {
                      return prev.map((x) => (x.id === payload.new!.id ? { ...x, ...(payload.new as Message) } : x));
                    }
                  }
                  return prev;
                });
              }
            }
          )
          .subscribe();

        // Polling fallback every 4s in case realtime is not enabled
        // Added comment to refresh TypeScript checker
        poll = window.setInterval(async () => {
          try {
            const { data } = await supabase
              .from('messages')
              .select('id,sender_id,recipient_id,content,created_at,read_at')
              .in('sender_id', [me, targetId])
              .in('recipient_id', [me, targetId])
              .order('created_at', { ascending: true });
            if (!data) return;

            // Only update messages if they've actually changed
            setMessages(prevMessages => {
              // Convert both arrays to JSON strings for comparison
              const prevMessagesStr = JSON.stringify(prevMessages.map(m => ({
                id: m.id,
                sender_id: m.sender_id,
                recipient_id: m.recipient_id,
                content: m.content,
                created_at: m.created_at,
                read_at: m.read_at
              })));

              const newMessagesStr = JSON.stringify((data as Message[]).map(m => ({
                id: m.id,
                sender_id: m.sender_id,
                recipient_id: m.recipient_id,
                content: m.content,
                created_at: m.created_at,
                read_at: m.read_at
              })));

              // Only update if messages have actually changed
              if (prevMessagesStr !== newMessagesStr) {
                return data as Message[];
              }
              return prevMessages;
            });
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

  // Set up real-time subscription for new messages and updates
  useEffect(() => {
    if (!me) return;

    const channel = supabase
      .channel('messages-conversations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          // When a new message is inserted, update the conversations list
          const newMessage = payload.new as Message | undefined;
          if (!newMessage) return;

          const isParticipant = newMessage.sender_id === me || newMessage.recipient_id === me;

          if (isParticipant) {
            // Update conversations list with the new message
            setConversations(prev => {
              const otherId = newMessage.sender_id === me ? newMessage.recipient_id : newMessage.sender_id;
              const existingConversation = prev.find(c => c.otherId === otherId);

              if (existingConversation) {
                // Only update if the message is actually newer
                const isNewer = new Date(newMessage.created_at) > new Date(existingConversation.lastAt);
                if (isNewer) {
                  return prev.map(c =>
                    c.otherId === otherId
                      ? { ...c, lastAt: newMessage.created_at, lastMessage: newMessage.content, lastMessageId: newMessage.id }
                      : c
                  ).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
                }
                return prev;
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
                  setConversations(prev => {
                    // Only update if profile data has actually changed
                    const conversation = prev.find(c => c.otherId === otherId);
                    if (conversation) {
                      const hasChanges =
                        conversation.name !== (data.name ?? null) ||
                        conversation.avatar_url !== (data.avatar_url ?? null);

                      if (hasChanges) {
                        return prev.map(c =>
                          c.otherId === otherId
                            ? { ...c, name: data.name ?? null, avatar_url: data.avatar_url ?? null }
                            : c
                        );
                      }
                    }
                    return prev;
                  });
                }
              });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload: any) => {
          // When a message is updated (e.g., case_status changed), check if it affects current conversation
          const updatedMessage = payload.new as Message | undefined;
          if (!updatedMessage) return;

          const isInCurrentConversation = targetId &&
            ((updatedMessage.sender_id === me && updatedMessage.recipient_id === targetId) ||
              (updatedMessage.sender_id === targetId && updatedMessage.recipient_id === me));

          // If this is an admin conversation that got updated, re-check the conversation status
          if (isInCurrentConversation && updatedMessage.conversation_type === 'user_to_admin') {
            // Re-check if conversation is closed
            (async () => {
              try {
                let adminUserId = null;
                try {
                  // Try to get admin profile instead of user record
                  const { data: adminProfile } = await supabase
                    .from('public_profiles')
                    .select('id')
                    .eq('email', 'admin@vendra.com')
                    .single();

                  if (adminProfile) {
                    adminUserId = adminProfile.id;
                  }
                } catch (error) {
                  console.warn('Could not fetch admin profile:', error);
                }

                if (adminUserId && (me === targetId || adminUserId === targetId)) {
                  const { data: conversationMessages } = await supabase
                    .from('messages')
                    .select('case_status')
                    .or(`and(sender_id.eq.${me},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${me})`)
                    .eq('conversation_type', 'user_to_admin')
                    .order('created_at', { ascending: false })
                    .limit(1);

                  if (conversationMessages && conversationMessages.length > 0) {
                    const isClosed = conversationMessages[0].case_status === 'closed';
                    setIsClosedConversation(isClosed);
                  } else {
                    setIsClosedConversation(false);
                  }
                }
              } catch (error) {
                console.error('Error checking conversation status on update:', error);
              }
            })();
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, targetId]); // Added targetId to dependencies to re-evaluate when conversation changes

  const canSend = useMemo(() => Boolean(me && targetId && text.trim().length > 0), [me, targetId, text]);

  const onSend = async () => {
    if (!canSend) return;

    try {
      // Check if this is a conversation with admin and if it's closed
      let adminUserId = null;
      try {
        // Try to get admin profile instead of user record
        const { data: adminProfile } = await supabase
          .from('public_profiles')
          .select('id')
          .eq('email', 'admin@vendra.com')
          .single();

        if (adminProfile) {
          adminUserId = adminProfile.id;
        }
      } catch (error) {
        console.warn('Could not fetch admin profile:', error);
      }

      const isAdminConversation = adminUserId && targetId === adminUserId;

      if (isAdminConversation) {
        // Check conversation status
        const response = await fetch('/functions/v1/check-conversation-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          },
          body: JSON.stringify({
            recipient_id: adminUserId,
            conversation_type: 'user_to_admin'
          })
        });

        if (response.ok) {
          const result = await response.json();

          if (result.is_closed) {
            alert('Esta conversación ha sido cerrada. Por favor, crea un nuevo reporte si tienes otra inquietud.');
            return;
          }
        }
      }

      const payload = {
        sender_id: me!,
        recipient_id: targetId!,
        content: text.trim(),
        conversation_type: isAdminConversation ? 'user_to_admin' : 'user_to_user'
      };
      setText("");
      try {
        const { data, error } = await supabase.from("messages").insert(payload).select("id, sender_id, recipient_id, content, created_at, read_at").single();
        if (error) throw error;
        if (data) {
          // Optimistic append in case realtime is delayed
          setMessages((prev) => [...prev, data]);
        }
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : String(e));
      }
    } catch (e) {
      console.error('Error checking conversation status:', e);
      alert('Error al verificar el estado de la conversación');
    }
  };

  // Handle opening a conversation with transition
  const openConversation = (conversationId: string) => {
    if (isMobileView) {
      // On mobile, navigate to the conversation (this will automatically show the chat view)
      router.push(`/messages?to=${conversationId}`, { scroll: false });
    } else {
      // On desktop, just navigate normally
      router.push(`/messages?to=${conversationId}`);
    }
  };

  // Handle going back to conversation list
  const goBackToConversations = () => {
    if (isMobileView) {
      router.push("/messages", { scroll: false });
    } else {
      router.push("/main");
    }
  };


  // ... (previous code)

  return (
    <main className="h-[100dvh] w-full bg-background/50 lg:static lg:h-auto lg:w-auto overflow-hidden lg:overflow-visible">

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-[-1] hidden lg:block">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl opacity-60" />
      </div>

      {/* Desktop version - Fixed layout */}
      <div className="hidden lg:flex h-[calc(100dvh-64px)] px-6 py-6 gap-6 max-w-7xl mx-auto">
        {/* Sidebar - Fixed */}
        <div className="w-96 shrink-0 h-full">
          <ConversationList
            conversations={conversations}
            search={search}
            setSearch={setSearch}
            showSearchBar={showSearchBar}
            setShowSearchBar={setShowSearchBar}
            openConversation={openConversation}
            targetId={targetId}
          />
        </div>

        {/* Chat pane */}
        <div className="flex-1 h-full min-w-0">
          {loading ? (
            <div className="h-full w-full bg-white/50 backdrop-blur-xl rounded-[2rem] border border-white/40 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : targetId ? (
            <ChatView
              target={target}
              messages={messages}
              me={me}
              text={text}
              setText={setText}
              setIsInputFocused={setIsInputFocused}
              onSend={onSend}
              canSend={canSend && !isClosedConversation}
              goBackToConversations={goBackToConversations}
              listRef={listRef}
              isClosedConversation={isClosedConversation}
            />
          ) : (
            <div className="h-full w-full bg-white/20 backdrop-blur-md rounded-[2rem] border border-white/20 flex flex-col items-center justify-center text-center p-8 text-muted-foreground/60 shadow-lg">
              <div className="h-32 w-32 bg-secondary/10 rounded-full flex items-center justify-center mb-6">
                <div className="text-6xl grayscale opacity-50">💬</div>
              </div>
              <h3 className="text-2xl font-serif font-bold text-primary/80 mb-2">Mensajes</h3>
              <p className="max-w-xs">Selecciona una conversación a la izquierda o busca un usuario para comenzar.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile version with full-screen experience */}
      <div className="lg:hidden w-full relative [&_*]:!touch-manipulation flex flex-col h-[100dvh] overflow-hidden bg-background">
        <AnimatePresence mode="wait">
          {(!targetId && !loading) || (isMobileView && !targetId) ? (
            <div className="h-full p-0 pt-[env(safe-area-inset-top)]">
              <ConversationList
                key="conversation-list"
                conversations={conversations}
                search={search}
                setSearch={setSearch}
                showSearchBar={showSearchBar}
                setShowSearchBar={setShowSearchBar}
                openConversation={openConversation}
                targetId={targetId}
              />
            </div>
          ) : targetId && !loading ? (
            <div className="h-full p-0">
              <ChatView
                key="chat-view"
                target={target}
                messages={messages}
                me={me}
                text={text}
                setText={setText}
                setIsInputFocused={setIsInputFocused}
                onSend={onSend}
                canSend={canSend && !isClosedConversation}
                goBackToConversations={goBackToConversations}
                listRef={listRef}
                isClosedConversation={isClosedConversation}
              />
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<main className="h-screen w-full flex items-center justify-center text-muted-foreground">Cargando...</main>}>
      <MessagesContent />
    </Suspense>
  );
}
