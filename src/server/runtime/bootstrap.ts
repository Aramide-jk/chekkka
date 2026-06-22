import "server-only";
import { connectMongoDB, disconnectMongoDB } from "../databases";
import { disconnectRedis } from "../databases/redis";

declare global {
	// eslint-disable-next-line no-var
	var __chekkaBootstrapped: boolean | undefined;
}

/**
 * One-time process bootstrap — warms the MongoDB connection and (in
 * subsequent phases) starts cron sweeps for overdue reports, payout
 * release, and OTP cleanup.
 */
export async function bootstrap(): Promise<void> {
	if (global.__chekkaBootstrapped) return;
	global.__chekkaBootstrapped = true;

	try {
		await connectMongoDB();
	} catch (error) {
		console.error("[chekka:bootstrap] MongoDB connect failed:", error);
	}

	// TODO: wire cron sweeps once cron module lands in Phase 5+

	const shutdown = async () => {
		try {
			await disconnectMongoDB();
		} catch {
			// no-op
		}
		try {
			await disconnectRedis();
		} catch {
			// no-op
		}
	};

	process.once("SIGINT", () => {
		shutdown().finally(() => process.exit(0));
	});
	process.once("SIGTERM", () => {
		shutdown().finally(() => process.exit(0));
	});
}
