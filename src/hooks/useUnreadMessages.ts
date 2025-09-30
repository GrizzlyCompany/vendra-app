"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Function to fetch unread messages count
    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null);

        if (error) {
          console.error("Error fetching unread messages count:", error);
          setUnreadCount(0);
        } else {
          setUnreadCount(count || 0);
        }
      } catch (err) {
        console.error("Error fetching unread messages count:", err);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchUnreadCount();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel("unread-messages-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          // When a new message is inserted for the user, increment the count
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          // When a message is marked as read, decrement the count if it was previously unread
          const oldRecord = payload.old as { read_at: string | null };
          const newRecord = payload.new as { read_at: string | null };
          
          // If message was unread and is now read, decrement count
          if (!oldRecord.read_at && newRecord.read_at) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Clean up subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { unreadCount, loading };
}