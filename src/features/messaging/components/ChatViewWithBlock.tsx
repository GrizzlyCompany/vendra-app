"use client";

import { RefObject } from "react";
import { ChatView } from "./ChatView";
import { useBlockStatus } from "../hooks/useUserBlocks";

interface Message {
    id: string;
    sender_id: string;
    recipient_id: string;
    content: string;
    created_at: string;
    read_at: string | null;
}

interface ChatViewWithBlockProps {
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
    targetId: string;
}

/**
 * Wrapper component that integrates block status with ChatView
 * This handles the block status loading and passes it to ChatView
 */
export function ChatViewWithBlock({
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
    targetId,
}: ChatViewWithBlockProps) {
    // Use the block status hook to check if this conversation is blocked
    const { blockStatus, loading: isBlockLoading, toggleBlock } = useBlockStatus(targetId);

    return (
        <ChatView
            target={target}
            messages={messages}
            me={me}
            text={text}
            setText={setText}
            setIsInputFocused={setIsInputFocused}
            onSend={onSend}
            canSend={canSend && !blockStatus?.any_block}
            goBackToConversations={goBackToConversations}
            listRef={listRef}
            isClosedConversation={isClosedConversation}
            isOnline={isOnline}
            subscribePush={subscribePush}
            pushPermission={pushPermission}
            blockStatus={blockStatus}
            onBlockToggle={toggleBlock}
            isBlockLoading={isBlockLoading}
        />
    );
}
