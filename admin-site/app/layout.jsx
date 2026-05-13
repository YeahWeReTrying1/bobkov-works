import "@fontsource/google-sans/latin.css";
import "@fontsource/google-sans/latin-ext.css";
import "@fontsource/google-sans/cyrillic.css";
import "@fontsource/google-sans/cyrillic-ext.css";
import "./globals.css";

export const metadata = {
  title: "Portfolio Admin",
  description: "Отдельная админка портфолио"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
