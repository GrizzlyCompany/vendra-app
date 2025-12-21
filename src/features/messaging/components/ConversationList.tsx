import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useTranslations } from "next-intl";

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
  onlineUsers?: Set<string>;
}

export function ConversationList({
  conversations,
  search,
  setSearch,
  showSearchBar,
  setShowSearchBar,
  openConversation,
  targetId,
  onlineUsers,
}: ConversationListProps) {
  const t = useTranslations("messages");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="w-full h-full flex flex-col bg-transparent lg:bg-white/50 lg:backdrop-blur-xl lg:rounded-[2rem] lg:border lg:border-white/40 lg:shadow-xl overflow-hidden"
      suppressHydrationWarning
    >
      {/* Search Header */}
      <div className="flex items-center justify-between px-4 py-3 lg:p-4 border-b border-border/40 lg:border-black/5 bg-background/80 lg:bg-white/40 backdrop-blur-md sticky top-0 z-10 mobile-top-safe" suppressHydrationWarning>
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
                  placeholder={t("searchConversations")}
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-xl lg:font-serif">{t("title")}</h1>
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
                      <img src={c.avatar_url} alt={c.name ?? t("user")} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-muted">
                        <User className="h-6 w-6 lg:h-5 lg:w-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  {onlineUsers?.has(c.otherId) && (
                    <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 lg:h-3 lg:w-3 rounded-full border-2 border-background lg:border-white bg-emerald-500 shadow-sm ring-1 ring-black/5 animate-in fade-in zoom-in duration-300"></div>
                  )}
                </div>

                <div className="min-w-0 flex-1 h-14 lg:h-auto flex flex-col justify-center">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className={`text-[17px] lg:text-sm font-semibold truncate transition-colors ${isActive ? 'text-primary' : 'text-foreground group-hover:text-primary/80'}`}>
                      {c.name ?? t("user")}
                    </span>
                    <span className={`text-[12px] lg:text-[10px] whitespace-nowrap ml-2 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground/80'}`}>
                      {mounted ? new Date(c.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div className={`text-[15px] lg:text-xs truncate pr-4 lg:pr-2 leading-snug ${isActive ? 'text-primary/70 font-medium' : 'text-muted-foreground'}`} title={c.lastMessage}>
                    {c.lastMessage || '...'}
                  </div>
                </div>
              </button>
            )
          })}
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 lg:pt-0 lg:min-h-[300px] text-center p-8" suppressHydrationWarning>
            <div className="h-20 w-20 lg:h-16 lg:w-16 rounded-full bg-primary/5 flex items-center justify-center mb-6 lg:mb-4 animate-in zoom-in duration-500">
              <div className="text-4xl grayscale opacity-40">💬</div>
            </div>
            <h3 className="text-xl lg:text-lg font-serif font-bold text-primary/80 mb-2">{t("startChatting")}</h3>
            <p className="text-muted-foreground text-sm max-w-xs mb-8">
              {t("emptyInbox")}
            </p>
            <Button
              asChild
              className="rounded-full px-8 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            >
              <Link href="/">{t("exploreProperties")}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}