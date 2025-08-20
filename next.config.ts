import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		reactCompiler: false,
	},
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "*" },
			{ protocol: "http", hostname: "*" },
		],
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	output: "standalone",
};

export default nextConfig;
