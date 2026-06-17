import type { Metadata } from "next";
import { Inter, Geist_Mono, Cinzel, Arvo } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ClientCustomizationProvider } from "@/contexts/client-customization-context";
import { Toaster } from "react-hot-toast";
import { NuqsAdapter } from "nuqs/adapters/next/app"; // <-- required
const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const arvo = Arvo({
  variable: "--font-arvo",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "CRM Dashboard",
  description: "A modern CRM application built with Next.js",
};

const themeBootstrapScript = `
(() => {
  try {
    var darkThemeIds = [
      "charcoal","midnight","navy","emerald","ruby","sapphire","noir","graphite",
      "dark-blue","classic-bw","cyberpunk","dracula","tokyo-night","matrix-glitch",
      "nordic-frost","solar-flare","oceanic-abyss","crimson-tide","synthwave-84",
      "monokai-pro","nord-aurora","midnight-moss","deep-ocean-inc","blood-moon",
      "rose-gold-dark","cyber-lime","neon-vamp","stealth-amber","abyssal-emerald",
      "sub-zero","toxic-waste","phantom-rose","purple-noir","golden-bull-dark","ocean"
    ];
    var darkSet = new Set(darkThemeIds);
    var pairMap = {
      "clean-slate": { b: "default", d: "charcoal" },
      "amber-glow": { b: "warm", d: "stealth-amber" },
      "arctic-cyan": { b: "cool", d: "sub-zero" },
      "evergreen": { b: "nature", d: "abyssal-emerald" },
      "red-horizon": { b: "sunset", d: "crimson-tide" },
      "ocean-drive": { b: "ocean", d: "deep-ocean-inc" },
      "forest-night": { b: "forest", d: "midnight-moss" },
      "berry-neon": { b: "berry", d: "phantom-rose" },
      "citrus-toxic": { b: "citrus", d: "toxic-waste" },
      "lavender-noir": { b: "lavender", d: "purple-noir" },
      "sage-matrix": { b: "sage", d: "matrix-glitch" },
      "coral-blood": { b: "coral", d: "blood-moon" },
      "midnight-ivory": { b: "custom", d: "midnight" },
      "blue-shift": { b: "dark-blue", d: "navy" },
      "rose-vamp": { b: "rose", d: "neon-vamp" },
      "mono-contrast": { b: "amethyst", d: "classic-bw" },
      "noir-radiant": { b: "sapphire", d: "noir" },
      "cyber-wave": { b: "ruby", d: "cyberpunk" },
      "dracula-dusk": { b: "sunset", d: "dracula" },
      "tokyo-frost": { b: "cool", d: "tokyo-night" },
      "nord-tundra": { b: "nord-aurora", d: "nordic-frost" },
      "solar-abyss": { b: "solar-flare", d: "oceanic-abyss" },
      "synth-graphite": { b: "synthwave-84", d: "graphite" },
      "gold-obsidian": { b: "rose-gold-dark", d: "monokai-pro" },
      "golden-bull": { b: "golden-bull-bright", d: "golden-bull-dark" }
    };
    var themeId;
    var pairId = window.localStorage.getItem("selected-theme-pair");
    var mode = window.localStorage.getItem("selected-theme-mode");
    if (pairId && pairMap[pairId]) {
      themeId = (mode === "dark") ? pairMap[pairId].d : pairMap[pairId].b;
    } else {
      themeId = window.localStorage.getItem("selected-theme") || "graphite";
      if (darkSet.has(themeId)) mode = "dark";
    }
    var isDark = mode === "dark" || darkSet.has(themeId);
    document.documentElement.classList.toggle("dark", isDark);
    // Mark theme as loaded after a frame to ensure styles are applied
    requestAnimationFrame(function() {
      document.body.classList.add("theme-loaded");
    });
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
        className={`${interSans.variable} ${geistMono.variable} ${cinzel.variable} ${arvo.variable} antialiased`}
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
