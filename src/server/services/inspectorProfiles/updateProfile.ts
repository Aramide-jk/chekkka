import "server-only";
import {
	type IInspectorProfile,
	updateInspectorProfileDB,
} from "@/server/models/inspectorProfiles";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function updateProfile({
	userId,
	patch,
}: {
	userId: string;
	patch: Partial<IInspectorProfile>;
}): Promise<IInspectorProfile | null> {
	const profile = await updateInspectorProfileDB(userId, patch);
	if (!profile) return null;
	await invalidateCacheKeys({ userId });
	return profile;
}
