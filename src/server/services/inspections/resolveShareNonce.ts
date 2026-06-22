import "server-only";
import { redisRetrieveKeyString } from "@/server/databases/redis";
import {
	getInspectionByIdDB,
	type IInspection,
} from "@/server/models/inspections";
import { shareKey } from "./createShareLink";

/**
 * Resolve a share nonce to its inspection. Returns null when the nonce is
 * unknown or expired. Used by the public /share/[nonce] page.
 */
export default async function resolveShareNonce({
	nonce,
}: {
	nonce: string;
}): Promise<IInspection | null> {
	const mapping = await redisRetrieveKeyString<{ inspectionId: string }>(
		shareKey(nonce),
	);
	if (!mapping?.inspectionId) return null;
	return getInspectionByIdDB(mapping.inspectionId);
}
