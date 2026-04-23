import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { WeeklyTrackerProvider } from "@/components/WeeklyTrackerProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Intraday Flow - Trading Tracker",
  description: "A minimalist weekly tracker for intraday traders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WeeklyTrackerProvider>
          {children}
        </WeeklyTrackerProvider>
      </body>
    </html>
  );
}
