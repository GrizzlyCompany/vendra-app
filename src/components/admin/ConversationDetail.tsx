// Improved ConversationDetail component with better message visibility
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, Send, AlertCircle, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useToastContext } from "@/components/ToastProvider";
import { MessageItem } from "@/features/messaging/components/MessageItem";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  case_status: string;
  conversation_type: string;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface ConversationDetailProps {
  conversationId: string;
  onBack: () => void;
}

export function ConversationDetail({ conversationId, onBack }: ConversationDetailProps) {
  const { error: showError, success: showSuccess } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isClosedConversation, setIsClosedConversation] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesLength = useRef(messages.length);
  const lastMessageId = useRef<string | null>(null);

  // Auto scroll to bottom when NEW messages are added
  useEffect(() => {
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

  // Load conversation details and messages
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let poll: number | null = null;

    const loadConversation = async () => {
      try {
        console.log('Loading conversation for user ID:', conversationId);

        // Validate conversationId
        if (!conversationId) {
          throw new Error('ID de conversación no válido');
        }

        setLoading(true);

        // Get admin user ID
        console.log('Fetching admin user...');
        const { data: adminUser, error: adminUserError } = await supabase
          .from('users')
          .select('id')
          .eq('email', 'admin@vendra.com')
          .maybeSingle();

        console.log('Admin user result:', { adminUser, adminUserError });

        if (adminUserError) {
          console.error('Error getting admin user:', adminUserError);
          throw new Error('No se pudo obtener el usuario administrador: ' + (adminUserError.message || 'Error desconocido'));
        }

        if (!adminUser) {
          throw new Error('Usuario administrador no encontrado');
        }

        setAdminUserId(adminUser.id);
        console.log('Admin user ID set:', adminUser.id);

        // Get user information
        console.log('Fetching user data for:', conversationId);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email, avatar_url')
          .eq('id', conversationId)
          .maybeSingle();

        console.log('User data result:', { userData, userError });

        if (userError) {
          console.error('Error getting user data:', userError);
          throw new Error('No se pudo obtener los datos del usuario: ' + (userError.message || 'Error desconocido'));
        }

        // Handle case where user doesn't exist
        if (!userData) {
          console.warn('User not found for ID:', conversationId);
          // Create a minimal user object for display purposes
          setUser({
            id: conversationId,
            name: 'Usuario desconocido',
            email: 'unknown@example.com',
            avatar_url: null
          });
        } else {
          if (cancelled) return;
          setUser(userData);
          console.log('User data set:', userData);
        }

        // Check if conversation is closed
        console.log('Checking conversation status...');
        const { data: conversationMessages, error: conversationError } = await supabase
          .from('messages')
          .select('case_status')
          .or(`and(sender_id.eq.${adminUser.id},recipient_id.eq.${conversationId}),and(sender_id.eq.${conversationId},recipient_id.eq.${adminUser.id})`)
          .order('created_at', { ascending: false })
          .limit(1);

        console.log('Conversation status result:', { conversationMessages, conversationError });

        if (conversationError) {
          console.warn('Error checking conversation status:', conversationError);
          // Don't throw here, just continue with default state (open)
        } else if (conversationMessages && conversationMessages.length > 0) {
          setIsClosedConversation(conversationMessages[0].case_status === 'closed');
          console.log('Conversation closed status:', conversationMessages[0].case_status);
        }

        // Load messages with comprehensive query
        console.log('Loading messages...');
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('id, sender_id, recipient_id, content, created_at, read_at, case_status, conversation_type')
          .or(`and(sender_id.eq.${adminUser.id},recipient_id.eq.${conversationId}),and(sender_id.eq.${conversationId},recipient_id.eq.${adminUser.id})`)
          .order('created_at', { ascending: true });

        console.log('Messages result:', { messagesData: messagesData?.length, messagesError });

        if (messagesError) {
          console.error('Error loading messages:', messagesError);
          throw new Error('No se pudieron cargar los mensajes: ' + (messagesError.message || 'Error desconocido'));
        }

        // Process messages to ensure proper classification
        const processedMessages = (messagesData || []).map((msg: any) => {
          // Ensure all messages in this conversation have the correct conversation_type
          if (msg.conversation_type !== 'user_to_admin') {
            return {
              ...msg,
              conversation_type: 'user_to_admin'
            };
          }
          return msg;
        });

        if (cancelled) return;
        setMessages(processedMessages);
        console.log('Messages set, count:', processedMessages.length);

        // Mark messages as read
        console.log('Marking messages as read...');
        const { error: readError } = await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('recipient_id', adminUser.id)
          .eq('sender_id', conversationId)
          .is('read_at', null);

        if (readError) {
          console.warn('Could not mark messages as read:', readError);
        } else {
          console.log('Messages marked as read');
        }

        // Set up real-time subscription with comprehensive filtering
        console.log('Setting up real-time subscription...');
        channel = supabase
          .channel(`admin-conversation-${adminUser.id}-${conversationId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'messages' },
            (payload: any) => {
              console.log('Real-time message event:', payload);
              const m = (payload.new || payload.old);
              if (!m) return;

              const inThread = (m.sender_id === adminUser.id && m.recipient_id === conversationId) ||
                (m.sender_id === conversationId && m.recipient_id === adminUser.id);
              if (!inThread) return;

              // Process message for proper classification
              let processedMessage = m;
              if (m.conversation_type !== 'user_to_admin') {
                processedMessage = {
                  ...m,
                  conversation_type: 'user_to_admin'
                };
              }

              if (payload.eventType === 'INSERT') {
                setMessages((prev) => {
                  // Check if message already exists to prevent duplicates
                  const messageExists = prev.some(msg => msg.id === payload.new!.id);
                  if (messageExists) {
                    return prev;
                  }
                  return [...prev, processedMessage as Message];
                });

                // Mark as read if it's from the user
                if ((payload.new as Message).recipient_id === adminUser.id) {
                  supabase
                    .from('messages')
                    .update({ read_at: new Date().toISOString() })
                    .eq('id', (payload.new as Message).id)
                    .is('read_at', null);
                }
              } else if (payload.eventType === 'UPDATE') {
                setMessages((prev) => {
                  return prev.map((x) => (x.id === payload.new!.id ? { ...x, ...(processedMessage as Message) } : x));
                });
              }
            }
          )
          .subscribe();
        console.log('Real-time subscription set up');

        // Polling fallback with comprehensive query
        poll = window.setInterval(async () => {
          try {
            console.log('Polling messages...');
            const { data: pollMessages, error: pollError } = await supabase
              .from('messages')
              .select('id, sender_id, recipient_id, content, created_at, read_at, case_status, conversation_type')
              .or(`and(sender_id.eq.${adminUser.id},recipient_id.eq.${conversationId}),and(sender_id.eq.${conversationId},recipient_id.eq.${adminUser.id})`)
              .order('created_at', { ascending: true });

            if (pollError) {
              console.warn('Polling error:', pollError);
              return;
            }

            if (!pollMessages) return;

            // Process messages for proper classification
            const processedPollMessages = pollMessages.map((msg: any) => {
              // Ensure all messages in this conversation have the correct conversation_type
              if (msg.conversation_type !== 'user_to_admin') {
                return {
                  ...msg,
                  conversation_type: 'user_to_admin'
                };
              }
              return msg;
            });

            setMessages(processedPollMessages);
            console.log('Polling updated messages, count:', processedPollMessages.length);
          } catch (pollErr) {
            console.warn('Polling exception:', pollErr);
          }
        }, 4000);
      } catch (err) {
        console.error('Error loading conversation:', err);
        showError('Error al cargar la conversación: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        if (!cancelled) {
          setLoading(false);
          console.log('Loading finished');
        }
      }
    };

    loadConversation();

    return () => {
      console.log('Cleaning up conversation detail effect');
      cancelled = true;
      try { if (channel) supabase.removeChannel(channel); } catch (err) { console.warn('Error removing channel:', err); }
      try { if (poll) window.clearInterval(poll); } catch (err) { console.warn('Error clearing interval:', err); }
    };
  }, [conversationId, showError]);

  const canSend = Boolean(text.trim().length > 0) && !isClosedConversation && adminUserId;

  const onSend = async () => {
    if (!canSend || !adminUserId) {
      console.warn('Cannot send message:', { canSend, adminUserId, isClosedConversation });
      return;
    }

    try {
      const payload = {
        sender_id: adminUserId,
        recipient_id: conversationId,
        content: text.trim(),
        conversation_type: 'user_to_admin',
        case_status: 'open'
      };

      setText("");

      const { data, error } = await supabase
        .from("messages")
        .insert(payload)
        .select("id, sender_id, recipient_id, content, created_at, read_at, case_status, conversation_type")
        .single();

      if (error) throw new Error('Error al enviar el mensaje: ' + (error.message || 'Error desconocido'));
      if (data) {
        // Optimistic append in case realtime is delayed
        setMessages((prev) => [...prev, data]);
        showSuccess('Mensaje enviado correctamente');
      }
    } catch (e: unknown) {
      console.error('Error sending message:', e);
      showError(e instanceof Error ? e.message : 'Error al enviar el mensaje');
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando conversación...</p>
        </div>
      </div>
    );
  }

  // Handle case where user data couldn't be loaded
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Error al cargar la conversación</h3>
          <p className="text-red-600 mb-4">No se pudieron obtener los datos del usuario.</p>
          <Button onClick={onBack} variant="outline">
            Volver a la lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden rounded-full w-10 h-10 border border-border/30 hover:border-border/50 transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt={user.name ?? 'Usuario'} className="h-full w-full object-cover" />
            ) : (
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {getInitials(user?.name ?? null)}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <div className="font-medium">{user?.name ?? 'Usuario'}</div>
            <div className="text-xs text-muted-foreground">{user?.email ?? ''}</div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-hidden"
      >
        <div
          className="h-full overflow-y-auto p-4 min-w-0"
          ref={listRef}
          style={{
            paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))'
          }}
        >
          <div className="space-y-3">
            {messages.map((m) => (
              <MessageItem key={m.id} message={m} me={adminUserId} animated />
            ))}
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground mt-10">Aún no hay mensajes. ¡Envía el primero!</div>
            )}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t p-2 bg-background z-40 flex-shrink-0" style={{
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
      }}>
        {isClosedConversation ? (
          <div className="flex flex-col items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div className="text-center">
              <h3 className="font-medium text-amber-800 mb-1">
                Esta conversación ha sido cerrada
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                El caso ha sido resuelto. Para seguir comunicándote con el usuario,
                puedes crear un nuevo reporte.
              </p>
              <Button
                onClick={() => {
                  // Navigate to reports page to create a new report
                  window.open('/reports', '_blank');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Crear Nuevo Reporte
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder="Escribe tu mensaje…"
              className="rounded-full flex-1 min-w-0"
            />
            <Button
              onClick={onSend}
              disabled={!canSend}
              className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}