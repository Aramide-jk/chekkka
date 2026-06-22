import "server-only";
import { setAvailabilityDB } from "@/server/models/inspectorProfiles";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function setAvailability({
	userId,
	toggleOn,
}: {
	userId: string;
	toggleOn: boolean;
}): Promise<boolean> {
	const ok = await setAvailabilityDB(userId, toggleOn);
	if (ok) await invalidateCacheKeys({ userId });
	return ok;
}
