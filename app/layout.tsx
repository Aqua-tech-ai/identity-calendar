import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import AuthSessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "ナルフィのゲーム庁",
  description: "ナルフィのゲーム庁 - 予約とお知らせ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600&display=swap"
          rel="stylesheet"
        />
        {/* FullCalendar v6 CSS CDN を一度だけ読み込む */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.19/index.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.19/index.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.19/index.css"
        />
      </head>
      <body className="min-h-dvh bg-slate-50 text-slate-800 antialiased">
        <AuthSessionProvider>
          <NavBar />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
