import type { Metadata } from "next";
import { Playfair_Display, PT_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import AuthenticatedBottomNav from "@/components/AuthenticatedBottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ToastProvider";
import { SupabaseStatus } from "@/components/debug/SupabaseStatus";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const ptSans = PT_Sans({
  variable: "--font-pt-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover" as const,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(135 29% 30%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(135 29% 30%)" }
  ]
};

export const metadata: Metadata = {
  title: "Vendra — Conecta compradores y vendedores de propiedades",
  description:
    "Vendra conecta compradores y vendedores de propiedades. Publica, descubre y gestiona inmuebles en un solo lugar.",
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vendra"
  },
  formatDetection: {
    telephone: false
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="hsl(135 29% 30%)" />
      </head>
      <body
        className={`${ptSans.variable} ${playfair.variable} antialiased`}
      >
        <ErrorBoundary>
          <ToastProvider>
            <div className="app-container">
              <Navbar />
              {children}
            </div>
            {/* Bottom nav visible solo para usuarios autenticados (y ya responsiva con md:hidden) */}
            <AuthenticatedBottomNav />
            {/* Debug component for development */}
            <SupabaseStatus />
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
