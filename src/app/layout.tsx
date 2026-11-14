import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

export const metadata: Metadata = { title: "验真链 AI｜验收证据链智能体", description: "面向中小企业项目交付场景的验收证据链智能体" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className="min-h-screen bg-slate-50 text-slate-950 antialiased"><AppHeader aiConfigured={Boolean(process.env.OPENAI_API_KEY?.trim())} />{children}</body></html>;
}
