import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import BazaarNavbar from "@/components/BazaarNavbar";
import "./styles.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Immortal Bazaar — Cultivation Mini-Marketplace",
  description:
    "A Chinese cultivation themed mini-marketplace built with Next.js, Supabase Postgres, and Supabase Storage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body suppressHydrationWarning>
        <BazaarNavbar />
        {children}
      </body>
    </html>
  );
}
