import { RefObject, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, ChevronLeft, AlertCircle, Send, MoreVertical, Phone, Video } from "lucide-react";
import { MessageItem } from "./MessageItem";
import Link from "next/link";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface ChatViewProps {
  target: { id: string; name: string | null; avatar_url: string | null } | null;
  messages: Message[];
  me: string | null;
  text: string;
  setText: (text: string) => void;
  setIsInputFocused: (focused: boolean) => void;
  onSend: () => void;
  canSend: boolean;
  goBackToConversations: () => void;
  listRef: RefObject<HTMLDivElement | null>;
  isClosedConversation?: boolean;
}

export function ChatView({
  target,
  messages,
  me,
  text,
  setText,
  setIsInputFocused,
  onSend,
  canSend,
  goBackToConversations,
  listRef,
  isClosedConversation = false,
}: ChatViewProps) {

  // Auto-scroll to bottom whenever messages (length) change
  // This handles both initial load and new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, target?.id, listRef]);

  // Hide Bottom Navigation on Mobile when ChatView is active
  useEffect(() => {
    // Add class to body
    document.body.classList.add('hide-bottom-nav');

    // Cleanup: remove class when component unmounts (user leaves chat)
    return () => {
      document.body.classList.remove('hide-bottom-nav');
    };
  }, []);

  return (
    <motion.div
      key="chat-view"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex flex-col h-full bg-white/50 backdrop-blur-xl rounded-[2rem] border border-white/40 shadow-2xl overflow-hidden"
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white/60 backdrop-blur-md z-10 shadow-sm transition-all">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBackToConversations}
            className="md:hidden rounded-full h-10 w-10 -ml-2 text-foreground hover:bg-black/5"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <div className="relative group cursor-pointer transition-transform active:scale-95">
            <Link href={target?.id ? `/profile/${target.id}` : '#'}>
              <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-white shadow-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {target?.avatar_url ? <img src={target.avatar_url} alt={target.name ?? 'Usuario'} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm"></div>
            </Link>
          </div>

          <div>
            <Link href={target?.id ? `/profile/${target.id}` : '#'}>
              <div className="font-serif font-bold text-base text-foreground hover:underline decoration-primary/30 underline-offset-4">{target?.name ?? 'Usuario'}</div>
            </Link>
            <div className="text-xs text-emerald-600 font-bold bg-emerald-100/50 px-2 py-0.5 rounded-full inline-block">En línea</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-black/5 hidden sm:flex hover:text-primary transition-colors">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-black/5 hidden sm:flex hover:text-primary transition-colors">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-black/5 hover:text-primary transition-colors">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Closed Case Banner */}
      {isClosedConversation && (
        <div className="px-6 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4 mb-2 shadow-sm">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 text-sm mb-1">
                Caso Cerrado
              </h3>
              <p className="text-xs text-amber-700 mb-3 leading-relaxed">
                Su caso ha sido cerrado por el administrador. Si tiene una inquietud diferente,
                por favor cree un nuevo reporte desde la sección de reportes.
              </p>
              <Button
                onClick={() => window.open('/reports', '_self')}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2 h-8 text-xs rounded-full shadow-md shadow-amber-900/10"
                size="sm"
              >
                Crear Nuevo Reporte
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto px-6 py-4 min-w-0 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30 scrollbar-thumb-rounded-full"
        ref={listRef}
        style={{
          paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))'
        }}
      >
        <div className="space-y-4">
          {messages.map((m) => (
            <MessageItem key={m.id} message={m} me={me} animated />
          ))}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
              <div className="h-24 w-24 bg-gradient-to-br from-primary/10 to-emerald-500/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <span className="text-5xl">👋</span>
              </div>
              <p className="font-serif font-bold text-lg text-primary/80">¡Saluda!</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">Comienza la conversación enviando un mensaje amable.</p>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/80 border-t border-white/50 backdrop-blur-xl z-40">
        <div className="flex items-center gap-2 max-w-4xl mx-auto bg-white/50 border border-black/5 p-2 rounded-full shadow-sm hover:shadow-md hover:bg-white transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30">
          <Input
            value={isClosedConversation ? "" : text}
            onChange={(e) => !isClosedConversation && setText(e.target.value)}
            onFocus={() => !isClosedConversation && setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onKeyDown={(e) => {
              if (!isClosedConversation && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={isClosedConversation ? "Chat cerrado" : "Escribe un mensaje..."}
            disabled={isClosedConversation}
            className="border-0 bg-transparent flex-1 ml-3 focus-visible:ring-0 shadow-none h-10 text-base md:text-sm placeholder:text-muted-foreground/40 font-medium"
          />
          <Button
            onClick={onSend}
            disabled={!canSend || isClosedConversation}
            size="icon"
            className={`rounded-full h-10 w-10 shrink-0 transition-all duration-300 shadow-md ${canSend && !isClosedConversation ? 'bg-primary hover:bg-primary/90 text-white hover:scale-105 active:scale-95 shadow-primary/20' : 'bg-muted text-muted-foreground opacity-30 shadow-none'}`}
          >
            <Send className="h-4 w-4 ml-0.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
