import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "品类市场分析报告",
  description: "基于已确认 Markdown 与结构化数据生成的可编辑 HTML 报告。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
