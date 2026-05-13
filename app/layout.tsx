import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "TTB Label Verifier",
  description: "Compare an alcohol label image against the application data.",
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
        <ThemeProvider>
          <I18nProvider>
            <Header />
            <main>{children}</main>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
