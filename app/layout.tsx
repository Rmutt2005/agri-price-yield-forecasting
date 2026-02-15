import "./globals.css";

import type { Metadata } from "next";
import { Prompt } from "next/font/google";

import { ThemeProvider } from "@/components/layout/ThemeClient";
import { BackgroundImageWrapper } from "@/components/layout/BackgroundImageWrapper";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "ระบบวิเคราะห์พยากรณ์ราคาและผลผลิตทางการเกษตร",
  description: "Thai Agricultural Decision Support System (UI prototype)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={prompt.variable}>
        <ThemeProvider>
          <BackgroundImageWrapper imageUrl="https://images.unsplash.com/photo-1729524461936-39afa1dedfcc?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D">
            {children}
          </BackgroundImageWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
