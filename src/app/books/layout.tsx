import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "我的书籍 - NotesHub",
};
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
} 