import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Loyalty Haven · The Jetsetter’s Resort",
  description:
    "Your miles and points, brought to life in a private seaside resort.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
