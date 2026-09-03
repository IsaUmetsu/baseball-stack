import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baseball View Viewer - debug_base",
  description: "Web browser viewer for MySQL debug_base view",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
