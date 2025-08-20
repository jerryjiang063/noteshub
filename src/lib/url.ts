export function getSiteUrl(): string {
	if (typeof window !== "undefined" && window.location?.origin) {
		return window.location.origin;
	}
	const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
	return envUrl && envUrl.trim().length > 0 ? envUrl : "http://localhost:3000";
} 