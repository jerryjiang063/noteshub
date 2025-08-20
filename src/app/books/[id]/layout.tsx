import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "笔记 - NotesHub",
};
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
} 