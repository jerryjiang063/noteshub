export function getSiteUrl(): string {
	if (typeof window !== "undefined" && window.location?.origin) {
		return window.location.origin;
	}
	const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
	return envUrl && envUrl.trim().length > 0 ? envUrl : "http://localhost:3000";
}

// Build absolute base URL from NextRequest, preferring reverse-proxy forwarded headers
export function getRequestBaseUrl(req: { headers: Headers; url: string }): string {
	const headers = req.headers;
	const proto = headers.get("x-forwarded-proto") || headers.get("x-forwarded-protocol") || "https";
	const host = headers.get("x-forwarded-host") || headers.get("host") || new URL(req.url).host;
	return `${proto}://${host}`;
} 