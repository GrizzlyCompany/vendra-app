import { RefObject, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, ChevronLeft, AlertCircle, Send, MoreVertical, Phone, Video, Ban, UserX, Flag, Loader2 } from "lucide-react";
import { MessageItem } from "./MessageItem";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useToastContext } from "@/components/ToastProvider";
import { useTranslations } from "next-intl";

// Report reason options
const REPORT_REASONS = (t: any) => [
  { value: 'harassment', label: t("reasons.harassment") },
  { value: 'spam', label: t("reasons.spam") },
  { value: 'fraud', label: t("reasons.fraud") },
  { value: 'fake_listing', label: t("reasons.fake_listing") },
  { value: 'inappropriate', label: t("reasons.inappropriate") },
  { value: 'impersonation', label: t("reasons.impersonation") },
  { value: 'other', label: t("reasons.other") },
] as const;

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface BlockStatus {
  i_blocked_them: boolean;
  they_blocked_me: boolean;
  any_block: boolean;
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
  isOnline?: boolean;
  subscribePush?: () => void;
  pushPermission?: NotificationPermission;
  // New block-related props
  blockStatus?: BlockStatus | null;
  onBlockToggle?: () => Promise<boolean>;
  isBlockLoading?: boolean;
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
  isOnline = false,
  subscribePush,
  pushPermission = 'default',
  blockStatus = null,
  onBlockToggle,
  isBlockLoading = false,
}: ChatViewProps) {
  const t = useTranslations("messages");
  const tCommon = useTranslations("common");
  const { error: showError, success: showSuccess } = useToastContext();

  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Determine if messaging is disabled due to block
  const isBlocked = blockStatus?.any_block ?? false;
  const iBlockedThem = blockStatus?.i_blocked_them ?? false;
  const theyBlockedMe = blockStatus?.they_blocked_me ?? false;

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

  const handleBlockToggle = async () => {
    if (!onBlockToggle) return;

    if (iBlockedThem) {
      // Unblocking - no confirmation needed
      await onBlockToggle();
    } else {
      // Blocking - show confirmation
      setShowBlockConfirm(true);
    }
  };

  const confirmBlock = async () => {
    if (onBlockToggle) {
      await onBlockToggle();
    }
    setShowBlockConfirm(false);
  };

  const handleReport = async () => {
    if (!target?.id || !reportReason) return;

    setIsReporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/report-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          reported_user_id: target.id,
          reason: reportReason,
          description: reportDescription || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("reportError"));
      }

      showSuccess(t("reportSuccess"));
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
    } catch (err: any) {
      console.error('Error reporting:', err);
      showError(err.message || t("reportError"));
    } finally {
      setIsReporting(false);
    }
  };

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
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white/60 backdrop-blur-md z-10 shadow-sm transition-all mobile-top-safe">
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
            <Link href={target?.id ? `/profile/view?id=${target.id}` : '#'}>
              <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-white shadow-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {target?.avatar_url ? <img src={target.avatar_url} alt={target.name ?? t("user")} className="h-full w-full object-cover" /> : null}
              </div>
              {isOnline && (
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm animate-pulse"></div>
              )}
            </Link>
          </div>

          <div>
            <Link href={target?.id ? `/profile/view?id=${target.id}` : '#'}>
              <div className="font-serif font-bold text-base text-foreground hover:underline decoration-primary/30 underline-offset-4">{target?.name ?? t("user")}</div>
            </Link>
            <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block transition-colors duration-500 ${isOnline ? 'text-emerald-600 bg-emerald-100/50' : 'text-muted-foreground/60 bg-muted/50'}`}>
              {isBlocked ? (
                <span className="text-red-500">{t("blocked")}</span>
              ) : isOnline ? t("online") : t("disconnected")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-black/5 hidden sm:flex hover:text-primary transition-colors">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-black/5 hidden sm:flex hover:text-primary transition-colors">
            <Video className="h-4 w-4" />
          </Button>

          {/* Options Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-black/5 hover:text-primary transition-colors">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl">
              <DropdownMenuItem className="cursor-pointer p-0">
                <Link href={target?.id ? `/profile/view?id=${target.id}` : '#'} className="w-full px-2 py-1.5">
                  {t("viewProfile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onBlockToggle && (
                <DropdownMenuItem
                  onClick={handleBlockToggle}
                  disabled={isBlockLoading}
                  className={`cursor-pointer ${iBlockedThem ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {iBlockedThem ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      {t("unblockUser")}
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      {t("blockUser")}
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowReportModal(true)}
                className="cursor-pointer text-amber-600"
              >
                <Flag className="h-4 w-4 mr-2" />
                {t("reportConversation")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Block Confirmation Modal */}
      {showBlockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 mx-4 max-w-sm w-full shadow-2xl"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                <Ban className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <h3 className="font-bold text-lg text-center mb-2">{t("blockTitle", { name: target?.name ?? t("user") })}</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {t("blockDescription")}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 rounded-full"
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={confirmBlock}
                disabled={isBlockLoading}
                className="flex-1 rounded-full bg-red-500 hover:bg-red-600 text-white"
              >
                {isBlockLoading ? t("blocking") : t("blockUser")}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Report Conversation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 mx-4 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center">
                <Flag className="h-8 w-8 text-amber-500" />
              </div>
            </div>
            <h3 className="font-bold text-lg text-center mb-2">{t("reportTitle", { name: target?.name ?? t("user") })}</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {t("reportDescription")}
            </p>

            {/* Reason Selection */}
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium text-gray-700">{t("reportReasonLabel")}</label>
              <div className="grid gap-2">
                {REPORT_REASONS(t).map((reason) => (
                  <button
                    key={reason.value}
                    onClick={() => setReportReason(reason.value)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${reportReason === reason.value
                      ? 'border-amber-500 bg-amber-50 text-amber-800 font-medium'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-gray-700">{t("reportDetailsLabel")}</label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder={t("reportPlaceholder")}
                className="min-h-[80px] rounded-xl resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                  setReportDescription('');
                }}
                className="flex-1 rounded-full"
                disabled={isReporting}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleReport}
                disabled={!reportReason || isReporting}
                className="flex-1 rounded-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isReporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("reporting")}
                  </>
                ) : (
                  t("submitReport")
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Block Banner - when user is blocked or has blocked the target */}
      {isBlocked && !isClosedConversation && (
        <div className="px-6 pt-4">
          <div className={`rounded-2xl p-4 flex items-start gap-4 mb-2 shadow-sm ${theyBlockedMe ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
            <Ban className={`h-5 w-5 flex-shrink-0 mt-0.5 ${theyBlockedMe ? 'text-red-600' : 'text-amber-600'}`} />
            <div className="flex-1">
              <h3 className={`font-bold text-sm mb-1 ${theyBlockedMe ? 'text-red-800' : 'text-amber-800'}`}>
                {theyBlockedMe ? t("blockedNoMessages") : t("youBlockedUser")}
              </h3>
              <p className={`text-xs leading-relaxed ${theyBlockedMe ? 'text-red-700' : 'text-amber-700'}`}>
                {theyBlockedMe
                  ? t("theyBlockedYouDesc")
                  : t("iBlockedThemDesc")}
              </p>
              {iBlockedThem && onBlockToggle && (
                <Button
                  onClick={onBlockToggle}
                  disabled={isBlockLoading}
                  className="mt-3 bg-amber-600 hover:bg-amber-700 text-white gap-2 h-8 text-xs rounded-full shadow-md shadow-amber-900/10"
                  size="sm"
                >
                  <UserX className="h-3 w-3" />
                  {t("unblockUser")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Closed Case Banner */}
      {isClosedConversation && (
        <div className="px-6 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4 mb-2 shadow-sm">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 text-sm mb-1">
                {t("caseClosed")}
              </h3>
              <p className="text-xs text-amber-700 mb-3 leading-relaxed">
                {t("caseClosedDesc")}
              </p>
              <Button
                onClick={() => window.open('/reports', '_self')}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2 h-8 text-xs rounded-full shadow-md shadow-amber-900/10"
                size="sm"
              >
                {t("createNewReport")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Request Banner */}
      {!isClosedConversation && !isBlocked && pushPermission === 'default' && subscribePush && (
        <div className="px-6 pt-4">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Send className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-primary text-sm">
                  {t("activateNotifications")}
                </h3>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {t("notificationsDesc")}
                </p>
              </div>
            </div>
            <Button
              onClick={subscribePush}
              className="bg-primary hover:bg-primary/90 text-white h-8 text-xs rounded-full px-4 shrink-0"
              size="sm"
            >
              {t("activate")}
            </Button>
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
              <p className="font-serif font-bold text-lg text-primary/80">{t("sayHello")}</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{t("sayHelloDesc")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-4 bg-white/80 border-t border-white/50 backdrop-blur-xl z-40">
        <div className="flex items-center gap-2 max-w-4xl mx-auto bg-white/50 border border-black/5 p-2 rounded-full shadow-sm hover:shadow-md hover:bg-white transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30">
          <Input
            value={isClosedConversation || isBlocked ? "" : text}
            onChange={(e) => !isClosedConversation && !isBlocked && setText(e.target.value)}
            onFocus={() => !isClosedConversation && !isBlocked && setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onKeyDown={(e) => {
              if (!isClosedConversation && !isBlocked && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={isClosedConversation ? t("chatClosed") : isBlocked ? t("chatBlocked") : t("typeMessage")}
            disabled={isClosedConversation || isBlocked}
            className="border-0 bg-transparent flex-1 ml-3 focus-visible:ring-0 shadow-none h-10 text-base md:text-sm placeholder:text-muted-foreground/40 font-medium"
          />
          <Button
            onClick={onSend}
            disabled={!canSend || isClosedConversation || isBlocked}
            size="icon"
            className={`rounded-full h-10 w-10 shrink-0 transition-all duration-300 shadow-md ${canSend && !isClosedConversation && !isBlocked ? 'bg-primary hover:bg-primary/90 text-white hover:scale-105 active:scale-95 shadow-primary/20' : 'bg-muted text-muted-foreground opacity-30 shadow-none'}`}
          >
            <Send className="h-4 w-4 ml-0.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
