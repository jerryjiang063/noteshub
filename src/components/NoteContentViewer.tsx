"use client";

import React, { useMemo } from "react";

function splitSentencesFromHtml(html: string): string[] {
  try {
    const text = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li)>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    const withBreaks = text.replace(/([。！？!?；;])/g, "$1\n");
    return withBreaks
      .split(/\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  } catch {
    return [html];
  }
}

export default function NoteContentViewer({ contentHtml, fontFamily }: { contentHtml: string; fontFamily?: string }) {
  const sentences = useMemo(() => splitSentencesFromHtml(contentHtml), [contentHtml]);
  return (
    <div className="grid gap-3">
      {sentences.map((line, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.06] p-3 fade-in-up"
          style={{ fontFamily: fontFamily || undefined }}
        >
          {line}
        </div>
      ))}
    </div>
  );
} 