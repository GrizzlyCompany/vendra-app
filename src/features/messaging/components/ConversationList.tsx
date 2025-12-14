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
      className="w-full h-full flex flex-col bg-transparent lg:bg-white/50 lg:backdrop-blur-xl lg:rounded-[2rem] lg:border lg:border-white/40 lg:shadow-xl overflow-hidden"
    >
      {/* Search Header */}
      <div className="flex items-center justify-between px-4 py-3 lg:p-4 border-b border-border/40 lg:border-black/5 bg-background/80 lg:bg-white/40 backdrop-blur-md sticky top-0 z-10 safe-area-top">
        {showSearchBar ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearchBar(false)}
              className="rounded-full w-9 h-9 hover:bg-black/5 -ml-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 ml-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  autoFocus
                  className="h-9 pl-9 bg-muted/50 border-transparent focus-visible:ring-primary/20 rounded-full shadow-none"
                  placeholder="Buscar..."
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-xl lg:font-serif">Mensajes</h1>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-10 h-10 hover:bg-black/5 text-primary lg:text-muted-foreground lg:w-9 lg:h-9"
              onClick={() => setShowSearchBar(true)}
            >
              <Search className="h-6 w-6 lg:h-5 lg:w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Conversations List - Native Style on Mobile */}
      <div className="flex-1 overflow-y-auto bg-background lg:bg-transparent pb-32 lg:pb-3 space-y-0 lg:space-y-1 scrollbar-hide">
        {conversations
          .filter(c => !search || (c.name ?? '').toLowerCase().includes(search.toLowerCase()))
          .map((c) => {
            const isActive = c.otherId === targetId;
            return (
              <button
                key={c.otherId}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 lg:px-3 lg:py-3 lg:rounded-2xl text-left transition-all duration-200 group active:bg-muted/50
                  ${isActive
                    ? 'bg-primary/5 lg:bg-primary/10 lg:shadow-sm lg:ring-1 lg:ring-primary/20'
                    : 'lg:hover:bg-white/60 lg:hover:shadow-sm lg:border lg:border-transparent lg:hover:border-white/50'
                  }
                  border-b border-border/40 last:border-0 lg:border-0
                `}
                onClick={() => openConversation(c.otherId)}
              >
                <div className="relative shrink-0">
                  <div className={`h-14 w-14 lg:h-12 lg:w-12 overflow-hidden rounded-full border border-border/50 lg:border-2 ${isActive ? 'lg:border-primary/20' : 'lg:border-white'} bg-muted lg:shadow-sm transition-colors`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.name ?? 'Usuario'} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-muted">
                        <User className="h-6 w-6 lg:h-5 lg:w-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1 h-14 lg:h-auto flex flex-col justify-center">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className={`text-[17px] lg:text-sm font-semibold truncate transition-colors ${isActive ? 'text-primary' : 'text-foreground group-hover:text-primary/80'}`}>
                      {c.name ?? 'Usuario'}
                    </span>
                    <span className={`text-[12px] lg:text-[10px] whitespace-nowrap ml-2 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground/80'}`}>
                      {new Date(c.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`text-[15px] lg:text-xs truncate pr-4 lg:pr-2 leading-snug ${isActive ? 'text-primary/70 font-medium' : 'text-muted-foreground'}`} title={c.lastMessage}>
                    {c.lastMessage ? c.lastMessage : 'Imagen'}
                  </div>
                </div>
              </button>
            )
          })}
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 lg:pt-0 lg:h-40 text-center p-8 opacity-60">
            <div className="h-16 w-16 lg:h-12 lg:w-12 rounded-full bg-muted lg:bg-black/5 flex items-center justify-center mb-4 lg:mb-3">
              <Search className="h-8 w-8 lg:h-5 lg:w-5 text-muted-foreground" />
            </div>
            <p className="text-base lg:text-sm font-medium text-muted-foreground">No tienes mensajes</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}