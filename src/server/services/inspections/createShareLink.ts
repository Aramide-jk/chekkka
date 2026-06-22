import "server-only";
import { v4 as uuidv4 } from "uuid";
import { redisUpdateKeyString } from "@/server/databases/redis";

const SHARE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function shareKey(nonce: string): string {
	return `share:${nonce}`;
}

/**
 * Mint a time-limited, unguessable share link for a completed report. The
 * nonce → inspectionId mapping lives in Redis with a 7-day TTL, so the link
 * grants read-only access without authentication and self-expires.
 */
export default async function createShareLink({
	inspectionId,
}: {
	inspectionId: string;
}): Promise<{ nonce: string }> {
	const nonce = uuidv4();
	await redisUpdateKeyString(
		shareKey(nonce),
		{ inspectionId },
		true,
		SHARE_TTL_SECONDS,
	);
	return { nonce };
}
