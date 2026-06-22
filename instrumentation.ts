/**
 * Next.js instrumentation hook — invoked once per server process on startup.
 * Used to warm DB/Redis connections and to schedule cron jobs (overdue-report
 * sweep, payout-release sweep, OTP cleanup, refresh-token cleanup).
 *
 * Only runs in the Node.js runtime; skipped for Edge.
 */
export async function register() {
	if (process.env.NEXT_RUNTIME !== "nodejs") return;
	const { bootstrap } = await import("./src/server/runtime/bootstrap");
	await bootstrap();
}
