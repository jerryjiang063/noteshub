export type GoogleImageSearchOptions = { title: string; author?: string | null; start?: number; num?: number };

function buildQuery(title: string, author?: string | null) {
  const parts: string[] = [];
  const t = (title || "").trim();
  const a = (author || "").trim();
  if (t) parts.push(t);
  if (a) parts.push(a);
  parts.push("书籍", "封面");
  return parts.join(" ");
}

export async function searchCoverLinks(opts: GoogleImageSearchOptions): Promise<string[]> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_CSE_KEY as string | undefined;
  const cx = process.env.NEXT_PUBLIC_GOOGLE_CSE_CX as string | undefined;
  if (!key || !cx) {
    console.warn("Missing NEXT_PUBLIC_GOOGLE_CSE_KEY or NEXT_PUBLIC_GOOGLE_CSE_CX");
    return [];
  }
  const q = buildQuery(opts.title, opts.author ?? undefined);
  const params = new URLSearchParams({
    key,
    cx,
    q,
    searchType: "image",
    safe: "active",
    num: String(Math.max(1, Math.min(10, opts.num ?? 10))),
  });
  if (opts.start) params.set("start", String(opts.start));
  const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn("Google CSE error", resp.status, resp.statusText);
      return [];
    }
    const json = await resp.json();
    const items = Array.isArray(json?.items) ? json.items : [];
    const links = items.map((it: any) => it?.link).filter((l: any) => typeof l === "string");
    return links as string[];
  } catch (err) {
    console.warn("Google CSE fetch failed", err);
    return [];
  }
} 