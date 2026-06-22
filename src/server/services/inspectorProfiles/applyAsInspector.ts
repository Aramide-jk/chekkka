import "server-only";
import type { Types } from "mongoose";
import { uploadAndResizeImage } from "@/server/helpers";
import {
	createInspectorProfileDB,
	type IInspectorProfile,
} from "@/server/models/inspectorProfiles";
import updateUser from "../users/updateUser";
import getByUserId from "./getByUserId";
import updateProfile from "./updateProfile";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export interface IApplyInput {
	userId: string;
	yearsExperience: number;
	specialisations: string[];
	bio: string;
	city?: string;
	documents: {
		idDocument?: { buffer: Buffer; mimeType: string };
		certificate?: { buffer: Buffer; mimeType: string };
		extra?: { buffer: Buffer; mimeType: string };
	};
}

/**
 * Upserts an inspector profile, uploads supplied documents, and flips the
 * caller's user record into the pending-inspector state.
 */
export default async function applyAsInspector({
	userId,
	yearsExperience,
	specialisations,
	bio,
	city,
	documents,
}: IApplyInput): Promise<IInspectorProfile | null> {
	const uploadedDocs: Record<string, string> = {};
	if (documents.idDocument) {
		uploadedDocs.idDocument = await uploadAndResizeImage({
			basePath: `inspectors/${userId}/id`,
			buffer: documents.idDocument.buffer,
			mimeType: documents.idDocument.mimeType,
		});
	}
	if (documents.certificate) {
		uploadedDocs.certificate = await uploadAndResizeImage({
			basePath: `inspectors/${userId}/cert`,
			buffer: documents.certificate.buffer,
			mimeType: documents.certificate.mimeType,
		});
	}
	if (documents.extra) {
		uploadedDocs.extra = await uploadAndResizeImage({
			basePath: `inspectors/${userId}/extra`,
			buffer: documents.extra.buffer,
			mimeType: documents.extra.mimeType,
		});
	}

	const payload = {
		yearsExperience,
		specialisations,
		bio,
		documents: uploadedDocs,
	};

	const existing = await getByUserId({ userId });
	let profile: IInspectorProfile | null;
	if (existing) {
		profile = await updateProfile({ userId, patch: payload });
	} else {
		profile = await createInspectorProfileDB({
			userId: userId as unknown as Types.ObjectId,
			...payload,
		});
		await invalidateCacheKeys({ userId });
	}

	await updateUser({
		id: userId,
		payload: { role: "inspector", status: "pending", city },
	});

	return profile;
}
