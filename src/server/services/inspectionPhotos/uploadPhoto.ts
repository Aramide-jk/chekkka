import "server-only";
import crypto from "node:crypto";
import type { Types } from "mongoose";
import { s3GetFileLink, uploadAndResizeImage } from "@/server/helpers";
import {
	adminLiveChannel,
	inspectionPhotoChannel,
	publish,
} from "@/server/lib/pubsub";
import {
	createInspectionPhotoDB,
	findPhotoByHashDB,
	type IInspectionPhoto,
	nextPhotoSequenceDB,
	type PhotoSection,
} from "@/server/models/inspectionPhotos";
import { incrementPhotoCountDB } from "@/server/models/inspections";
import { PHOTO_CACHE_TTL_SECONDS } from "./listForInspection";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export interface IUploadPhotoInput {
	inspectionId: string;
	section: PhotoSection;
	note?: string;
	file?: { buffer: Buffer; mimeType: string };
	urlOverride?: string;
}

export default async function uploadPhoto({
	inspectionId,
	section,
	note,
	file,
	urlOverride,
}: IUploadPhotoInput): Promise<IInspectionPhoto> {
	// Dedup identical file bytes within a single inspection — a buyer
	// watching the live feed must never see the same photo twice from a
	// retried/double-submitted upload.
	const contentHash = file
		? crypto.createHash("sha256").update(file.buffer).digest("hex")
		: undefined;
	if (contentHash) {
		const existing = await findPhotoByHashDB(inspectionId, contentHash);
		if (existing) return existing;
	}

	let url = urlOverride ?? "";
	if (file) {
		url = await uploadAndResizeImage({
			basePath: `inspections/${inspectionId}/photos`,
			buffer: file.buffer,
			mimeType: file.mimeType,
		});
	}
	if (!url) {
		url = `mock://inspections/${inspectionId}/${Date.now()}.jpg`;
	}

	const sequence = await nextPhotoSequenceDB(inspectionId);
	let photo: IInspectionPhoto;
	try {
		photo = await createInspectionPhotoDB({
			inspectionId: inspectionId as unknown as Types.ObjectId,
			section,
			url,
			note,
			sequence,
			contentHash,
			takenAt: new Date(),
		});
	} catch (err) {
		// Two uploads with identical bytes raced past the lookup above. The
		// partial unique index caught it — return the winner instead of
		// surfacing the duplicate-key error to the caller.
		if (
			contentHash &&
			(err as { code?: number } | undefined)?.code === 11000
		) {
			const winner = await findPhotoByHashDB(inspectionId, contentHash);
			if (winner) return winner;
		}
		throw err;
	}

	await incrementPhotoCountDB(inspectionId);
	await invalidateCacheKeys({ inspectionId });

	// Live subscribers render the image straight from this event, so resolve the
	// stored S3 key to a presigned link first — the raw key isn't a valid src.
	const resolvedUrl = await s3GetFileLink({
		fileName: photo.url,
		expiresInSeconds: PHOTO_CACHE_TTL_SECONDS,
	}).catch(() => photo.url);

	const event = {
		type: "photo" as const,
		inspectionId,
		photo: {
			_id: photo._id.toString(),
			section: photo.section,
			url: resolvedUrl,
			note: photo.note,
			sequence: photo.sequence,
			takenAt: photo.takenAt.toISOString(),
		},
	};
	await publish(inspectionPhotoChannel(inspectionId), event);
	await publish(adminLiveChannel(), { ...event, kind: "photo" });

	return photo;
}
