"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client"; // Use standard client
import { useAuth } from "@/features/auth/hooks/useAuth"; // Use centralized hook

// Public Whitelist - these routes do not require authentication
const PUBLIC_ROUTES = [
    "/",
    "/login",
    "/signup",
    "/reset-password",
    "/about",
    "/faq",
    "/terms",
    "/privacy",
    "/auth/callback",
    "/pricing",
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth(); // Use single source of truth
    const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

    useEffect(() => {
        // Wait for auth to finish loading
        if (authLoading) return;

        const checkGuard = async () => {
            // 1. Check if route is public
            const isPublic = PUBLIC_ROUTES.some(route =>
                pathname === route || pathname?.startsWith(`${route}/`)
            );

            // 2. Auth Check for Private Routes
            if (!isPublic && !user) {
                // Redirect to login preserving the return url
                const returnUrl = encodeURIComponent(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ""));
                router.push(`/login?redirect_url=${returnUrl}`);
                return;
            }

            // 3. Auth Page Redirect (Already logged in)
            if (user && (pathname === '/login' || pathname === '/signup')) {
                router.push('/main');
                return;
            }

            // 4. Admin Route Protection
            if (pathname?.startsWith('/admin')) {
                if (!user) {
                    router.push('/main');
                    return;
                }

                setIsVerifyingAdmin(true);
                // Fetch user role to verify admin
                const { data: userData } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                setIsVerifyingAdmin(false);

                if (userData?.role !== 'admin') {
                    router.push('/main');
                    return;
                }
            }
        };

        checkGuard();
    }, [pathname, router, searchParams, user, authLoading]);

    // Show loading state while checking
    const isPublic = PUBLIC_ROUTES.some(route => pathname === route || pathname?.startsWith(`${route}/`));
    const isLoading = authLoading || isVerifyingAdmin;

    if (isLoading && !isPublic) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="mt-4 text-muted-foreground text-sm tracking-widest uppercase">Verificando acceso...</p>
            </div>
        );
    }

    // Render children
    return <>{children}</>;
}
