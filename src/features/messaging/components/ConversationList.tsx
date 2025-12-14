import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, User } from "lucide-react";
import { Input } from "@/components/ui/input";

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
      className="w-full h-full flex flex-col bg-white/50 backdrop-blur-xl rounded-[2rem] border border-white/40 shadow-xl overflow-hidden"
    >
      {/* Search Header */}
      <div className="flex items-center justify-between p-4 border-b border-black/5 bg-white/40 backdrop-blur-md sticky top-0 z-10">
        {showSearchBar ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearchBar(false)}
              className="rounded-full w-9 h-9 hover:bg-black/5"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 ml-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  autoFocus
                  className="h-9 pl-9 bg-white/50 border-transparent focus-visible:ring-primary/20 rounded-full shadow-inner"
                  placeholder="Buscar chats..."
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
            <h1 className="text-xl font-serif font-bold tracking-tight text-foreground px-2">Mensajes</h1>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-9 h-9 hover:bg-black/5 text-muted-foreground"
              onClick={() => setShowSearchBar(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        {conversations
          .filter(c => !search || (c.name ?? '').toLowerCase().includes(search.toLowerCase()))
          .map((c) => {
            const isActive = c.otherId === targetId;
            return (
              <button
                key={c.otherId}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all duration-200 group
                  ${isActive
                    ? 'bg-primary/10 shadow-sm ring-1 ring-primary/20'
                    : 'hover:bg-white/60 hover:shadow-sm border border-transparent hover:border-white/50'
                  }
                `}
                onClick={() => openConversation(c.otherId)}
              >
                <div className="relative">
                  <div className={`h-12 w-12 overflow-hidden rounded-full border-2 ${isActive ? 'border-primary/20' : 'border-white'} bg-muted shadow-sm transition-colors`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.name ?? 'Usuario'} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-muted">
                        <User className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  {/* Status Indicator (Mocked for now) */}
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm"></div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className={`text-sm font-bold truncate transition-colors ${isActive ? 'text-primary' : 'text-foreground group-hover:text-primary/80'}`}>
                      {c.name ?? 'Usuario'}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 font-medium">
                      {new Date(c.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`text-xs truncate pr-2 font-medium ${isActive ? 'text-primary/70' : 'text-muted-foreground'}`} title={c.lastMessage}>
                    {c.lastMessage ? c.lastMessage : 'Imagen'}
                  </div>
                </div>
              </button>
            )
          })}
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-center p-4 opacity-50">
            <div className="h-12 w-12 rounded-full bg-black/5 flex items-center justify-center mb-3">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No tienes conversaciones.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}