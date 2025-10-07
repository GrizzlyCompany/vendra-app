import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft } from "lucide-react";

interface Conversation {
  otherId: string;
  name: string | null;
  avatar_url: string | null;
  lastAt: string;
  lastMessage: string;
  lastMessageId: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  search: string;
  setSearch: (search: string) => void;
  showSearchBar: boolean;
  setShowSearchBar: (show: boolean) => void;
  openConversation: (conversationId: string) => void;
  targetId: string | null;
}

export function ConversationList({
  conversations,
  search,
  setSearch,
  showSearchBar,
  setShowSearchBar,
  openConversation,
  targetId,
}: ConversationListProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full flex flex-col pb-20"
    >
      {/* Mobile Header - Fixed at the top */}
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        {showSearchBar ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearchBar(false)}
              className="rounded-full w-10 h-10 border border-border/30 hover:border-border/50 transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 ml-2">
              <div className="flex w-full items-center gap-2 rounded-xl border bg-muted px-3 py-2">
                <Search className="text-emerald-600 h-4 w-4" />
                <input
                  autoFocus
                  className="h-9 flex-1 bg-transparent outline-none text-sm"
                  placeholder="Buscar"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => {
                    if (!search) setShowSearchBar(false);
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Chats</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearchBar(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto pt-2">
        {conversations
          .filter(c => !search || (c.name ?? '').toLowerCase().includes(search.toLowerCase()))
          .map((c) => (
            <button
              key={c.otherId}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 text-left ${c.otherId === targetId ? 'bg-muted/60' : ''}`}
              onClick={() => openConversation(c.otherId)}
            >
              <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.avatar_url ? <img src={c.avatar_url} alt={c.name ?? 'Usuario'} className="h-full w-full object-cover"/> : null}
              </div>
              <div className="min-w-0 flex-1">
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
        {conversations.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground">No hay conversaciones recientes.</div>
        )}
      </div>
    </motion.div>
  );
}