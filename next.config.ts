import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	reactStrictMode: true,
	poweredByHeader: false,
	allowedDevOrigins: ["127.0.0.1"],
	compiler: {
		styledComponents: true,
	},
	serverExternalPackages: [
		"@aws-sdk/client-s3",
		"@aws-sdk/s3-request-presigner",
		"bcrypt",
		"cron",
		"ioredis",
		"mongoose",
		"prom-client",
		"sharp",
	],
	async headers() {
		return [
			{
				source: "/",
				headers: [
					{
						key: "cache-control",
						value: "no-cache",
					},
				],
			},
		];
	},
};

export default nextConfig;
