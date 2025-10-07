import { RefObject } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, ChevronLeft } from "lucide-react";
import { MessageItem } from "./MessageItem";

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
}: ChatViewProps) {
  return (
    <motion.div
      key="chat-view"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex flex-col h-full"
    >
      {/* Chat Header - Fixed at the top */}
      <div className="flex items-center justify-between p-4 border-b bg-background z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBackToConversations}
            className="md:hidden rounded-full w-10 h-10 border border-border/30 hover:border-border/50 transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {target?.avatar_url ? <img src={target.avatar_url} alt={target.name ?? 'Usuario'} className="h-full w-full object-cover"/> : null}
          </div>
          <div>
            <div className="font-medium">{target?.name ?? 'Usuario'}</div>
            <div className="text-xs text-muted-foreground">En línea</div>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages Area - Scrollable content with flex-1 */}
      <div
        className="flex-1 overflow-y-auto p-4 min-w-0"
        ref={listRef}
        style={{
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))'
        }}
      >
        <div className="space-y-3">
          {messages.map((m) => (
            <MessageItem key={m.id} message={m} me={me} animated />
          ))}
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground mt-10">Aún no hay mensajes. ¡Envía el primero!</div>
          )}
        </div>
      </div>

      {/* Input Area - Fixed at the bottom with border-t and p-2 */}
      <div className="border-t p-2 bg-background z-40" style={{
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
      }}>
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
          <Button onClick={onSend} disabled={!canSend} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700 flex-shrink-0">
            Enviar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
