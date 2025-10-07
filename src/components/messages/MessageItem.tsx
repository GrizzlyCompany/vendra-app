import { motion } from "framer-motion";

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
  const mine = message.sender_id === me;

  const content = (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm shadow ${mine ? 'bg-emerald-600 text-white' : 'bg-muted text-foreground'}`}>
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        <div className="mt-1 text-[10px] opacity-70 text-right">
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {mine && (<span className="ml-2">{message.read_at ? '✓✓' : '✓'}</span>)}
        </div>
      </div>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        key={message.id}
        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm shadow ${mine ? 'bg-emerald-600 text-white' : 'bg-muted text-foreground'}`}>
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
          <div className="mt-1 text-[10px] opacity-70 text-right">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {mine && (<span className="ml-2">{message.read_at ? '✓✓' : '✓'}</span>)}
          </div>
        </div>
      </motion.div>
    );
  }

  return content;
}