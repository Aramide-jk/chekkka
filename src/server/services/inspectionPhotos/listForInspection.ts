import "server-only";
import {
	type IInspectionPhoto,
	listPhotosForInspectionDB,
} from "@/server/models/inspectionPhotos";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

// Photos arrive live during an inspection — the list is cached only briefly.
// This same window is reused as the presigned-link expiry when resolving photo
// S3 keys, so a link stays valid for exactly as long as the payload that
// carries it is considered fresh.
export const PHOTO_CACHE_TTL_SECONDS = 15;

export function getQueryKey({ inspectionId }: { inspectionId: string }) {
	return `services:inspectionPhotos:listForInspection:${inspectionId}`;
}

const memo = makeInProcessCache<IInspectionPhoto[]>();
export function clearInProcessCache(inspectionId?: string): void {
	memo.clear(inspectionId);
}

export default async function listForInspection({
	inspectionId,
	refreshCache,
}: {
	inspectionId: string;
	refreshCache?: boolean;
}): Promise<IInspectionPhoto[]> {
	const result = await withDualLayerCache<IInspectionPhoto[]>({
		memo,
		memoKey: inspectionId,
		redisKey: getQueryKey({ inspectionId }),
		redisTtlSeconds: PHOTO_CACHE_TTL_SECONDS,
		refreshCache,
		loader: () => listPhotosForInspectionDB(inspectionId),
	});
	return result ?? [];
}
