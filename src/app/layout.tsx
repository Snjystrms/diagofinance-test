import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ClientCustomizationProvider } from "@/contexts/client-customization-context";
import { Toaster } from "react-hot-toast";
import { THEME_STORAGE_KEY } from "@/lib/client-presets";
import { NuqsAdapter } from "nuqs/adapters/next/app"; // <-- required
const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM Dashboard",
  description: "A modern CRM application built with Next.js",
};

const themeBootstrapScript = `
(() => {
  try {
    const darkThemes = new Set(["ocean", "midnight", "charcoal", "navy", "emerald", "ruby", "sapphire", "dark-blue", "noir", "graphite"]);
    const storedTheme = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || "graphite";
    const root = document.documentElement;
    root.classList.toggle("dark", darkThemes.has(storedTheme));
  } catch (_error) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="cryptomus" content="b4a2ebfe" />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${interSans.variable} ${geistMono.variable} antialiased`}
      >
        <NuqsAdapter>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              <ClientCustomizationProvider>
                {children}
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                  }}
                />
              </ClientCustomizationProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
