import type { IEnv } from "@/types";

export default function defaultEnvOptions(): IEnv {
	return {
		NODE_ENV: process.env.NODE_ENV ?? "development",
		NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "",
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
		NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:
			process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "",
	};
}
