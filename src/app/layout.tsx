import type { Metadata } from "next";
import "@fontsource/google-sans/latin.css";
import "@fontsource/google-sans/latin-ext.css";
import "@fontsource/google-sans/cyrillic.css";
import "@fontsource/google-sans/cyrillic-ext.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bobkov Portfolio",
  description: "Портфолио графического дизайнера"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
