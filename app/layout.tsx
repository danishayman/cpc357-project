import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/**
 * Inter font - Chosen for outdoor readability
 * 
 * Inter is a highly legible sans-serif font designed for UI.
 * It performs well in bright outdoor conditions and on small screens.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Feeder Dashboard",
  description: "Monitor and control your outdoor stray animal feeder remotely. Track food levels, water status, and feeding events in real-time.",
  keywords: ["IoT", "smart feeder", "animal care", "stray animals", "remote monitoring"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fafaf9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
