import { motion } from "framer-motion";
import { Check, CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface MessageItemProps {
  message: Message;
  me: string | null;
  animated?: boolean;
}

export function MessageItem({ message, me, animated = false }: MessageItemProps) {
  const t = useTranslations("messages");
  const mine = message.sender_id === me;

  const Bubble = (
    <div
      className={`
        relative max-w-[85%] sm:max-w-[75%] rounded-[1.25rem] px-5 py-3 text-sm shadow-sm transition-all
        ${mine
          ? 'bg-gradient-to-br from-primary to-emerald-800 text-white rounded-tr-sm ml-auto shadow-emerald-900/10'
          : 'bg-white border border-transparent text-foreground rounded-tl-sm shadow-sm'
        // Removed dark mode classes as we enforce Bone White
        }
      `}
    >
      <div className="whitespace-pre-wrap break-words leading-relaxed tracking-wide font-medium">{message.content}</div>
      <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] font-medium opacity-80 ${mine ? 'text-emerald-100' : 'text-muted-foreground'}`}>
        <span>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {mine && (
          <span className="ml-1" title={message.read_at ? t("read") : t("sent")}>
            {message.read_at ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
          </span>
        )}
      </div>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className={`flex w-full mb-2 ${mine ? 'justify-end' : 'justify-start'}`}
      >
        {Bubble}
      </motion.div>
    );
  }

  return (
    <div className={`flex w-full mb-2 ${mine ? 'justify-end' : 'justify-start'}`}>
      {Bubble}
    </div>
  );
}