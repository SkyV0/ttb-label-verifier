import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { QueryProvider } from "@/components/QueryProvider";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "TTB Label Verifier",
  description: "Compare an alcohol label image against the application data.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1816" },
  ],
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme') || 'system';
    var resolved = stored === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : stored;
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-pref', stored);
  } catch (e) {}
})();
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider>
            <I18nProvider>
              <Header />
              <main>{children}</main>
            </I18nProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
