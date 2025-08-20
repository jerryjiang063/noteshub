"use client";

import Image from "next/image";

function isValidSrc(src?: string | null): boolean {
  if (!src) return false;
  return src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/");
}

export default function BookCover({ title, coverUrl, className, compact, size }: { title: string; coverUrl?: string | null; className?: string; compact?: boolean; size?: 'large' | 'normal' | 'small' }) {
  // size rules: 'large' (books grid), 'normal' (editor header), 'small' (very tight)
  const variant = size || (compact ? 'small' : 'large');
  const titleSize = variant === 'large'
    ? "text-5xl sm:text-6xl md:text-7xl"
    : variant === 'normal'
    ? "text-3xl sm:text-4xl md:text-5xl"
    : "text-base";
  const clamp = variant === 'small' ? "line-clamp-2" : "line-clamp-3";
  const valid = isValidSrc(coverUrl ?? undefined);
  return (
    <div className={`cover-3-4 rounded-xl shadow-sm sm:shadow ${className ?? ""}`}>
      {valid ? (
        <Image src={coverUrl as string} alt={title} fill sizes="(max-width: 768px) 100vw, 25vw" style={{ objectFit: "cover" }} unoptimized referrerPolicy="no-referrer" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f6f2e8] p-2 cover-fallback">
          <div className="text-center font-bold leading-tight text-balance px-2">
            <span className={`${titleSize} ${clamp}`}>{title}</span>
          </div>
        </div>
      )}
    </div>
  );
} 