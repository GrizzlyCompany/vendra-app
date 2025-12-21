"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

interface BlockStatus {
    i_blocked_them: boolean;
    they_blocked_me: boolean;
    any_block: boolean;
}

interface BlockedUser {
    blocked_id: string;
    blocked_name: string | null;
    blocked_avatar: string | null;
    blocked_at: string;
}

/**
 * Hook para gestionar bloqueos entre usuarios
 * Permite bloquear, desbloquear y verificar estado de bloqueo
 */
export function useUserBlocks() {
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Cargar lista de usuarios bloqueados por el usuario actual
     */
    const loadBlockedUsers = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc("get_blocked_users");

            if (rpcError) {
                console.error("Error loading blocked users:", rpcError);
                setError(rpcError.message);
                return;
            }

            setBlockedUsers(data || []);
        } catch (err) {
            console.error("Error loading blocked users:", err);
            setError("Error al cargar usuarios bloqueados");
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Verificar estado de bloqueo con un usuario específico
     */
    const checkBlockStatus = useCallback(
        async (userId: string): Promise<BlockStatus | null> => {
            try {
                const { data, error: rpcError } = await supabase.rpc(
                    "check_block_status",
                    {
                        other_user_id: userId,
                    }
                );

                if (rpcError) {
                    console.error("Error checking block status:", rpcError);
                    return null;
                }

                return data as BlockStatus;
            } catch (err) {
                console.error("Error checking block status:", err);
                return null;
            }
        },
        []
    );

    /**
     * Bloquear un usuario
     */
    const blockUser = useCallback(
        async (userId: string): Promise<boolean> => {
            try {
                const { data, error: rpcError } = await supabase.rpc("block_user", {
                    user_to_block: userId,
                });

                if (rpcError) {
                    console.error("Error blocking user:", rpcError);
                    return false;
                }

                if (data?.success) {
                    // Recargar lista de bloqueados
                    await loadBlockedUsers();
                    return true;
                }

                return false;
            } catch (err) {
                console.error("Error blocking user:", err);
                return false;
            }
        },
        [loadBlockedUsers]
    );

    /**
     * Desbloquear un usuario
     */
    const unblockUser = useCallback(
        async (userId: string): Promise<boolean> => {
            try {
                const { data, error: rpcError } = await supabase.rpc("unblock_user", {
                    user_to_unblock: userId,
                });

                if (rpcError) {
                    console.error("Error unblocking user:", rpcError);
                    return false;
                }

                if (data?.success) {
                    // Actualizar lista local
                    setBlockedUsers((prev) =>
                        prev.filter((u) => u.blocked_id !== userId)
                    );
                    return true;
                }

                return false;
            } catch (err) {
                console.error("Error unblocking user:", err);
                return false;
            }
        },
        []
    );

    /**
     * Verificar si un usuario está bloqueado (verificación rápida local)
     */
    const isBlockedLocally = useCallback(
        (userId: string): boolean => {
            return blockedUsers.some((u) => u.blocked_id === userId);
        },
        [blockedUsers]
    );

    // Cargar usuarios bloqueados al montar el componente
    useEffect(() => {
        loadBlockedUsers();
    }, [loadBlockedUsers]);

    return {
        blockedUsers,
        loading,
        error,
        blockUser,
        unblockUser,
        checkBlockStatus,
        isBlockedLocally,
        refreshBlockedUsers: loadBlockedUsers,
    };
}

/**
 * Hook simplificado para verificar estado de bloqueo con un usuario específico
 */
export function useBlockStatus(userId: string | null) {
    const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const { blockUser, unblockUser } = useUserBlocks();

    const checkStatus = useCallback(async () => {
        if (!userId) {
            setBlockStatus(null);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc("check_block_status", {
                other_user_id: userId,
            });

            if (error) {
                console.error("Error checking block status:", error);
                setBlockStatus(null);
                return;
            }

            setBlockStatus(data as BlockStatus);
        } catch (err) {
            console.error("Error checking block status:", err);
            setBlockStatus(null);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Verificar estado al cargar o cuando cambia el userId
    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    const toggleBlock = useCallback(async () => {
        if (!userId) return false;

        let success: boolean;
        if (blockStatus?.i_blocked_them) {
            success = await unblockUser(userId);
        } else {
            success = await blockUser(userId);
        }

        if (success) {
            // Actualizar estado local
            await checkStatus();
        }

        return success;
    }, [userId, blockStatus, blockUser, unblockUser, checkStatus]);

    return {
        blockStatus,
        loading,
        isBlocked: blockStatus?.any_block ?? false,
        iBlockedThem: blockStatus?.i_blocked_them ?? false,
        theyBlockedMe: blockStatus?.they_blocked_me ?? false,
        toggleBlock,
        refreshStatus: checkStatus,
    };
}
