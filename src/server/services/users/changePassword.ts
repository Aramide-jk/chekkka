import "server-only";
import { changePasswordDB } from "@/server/models/users";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function changePassword({
	id,
	newPassword,
}: {
	id: string;
	newPassword: string;
}): Promise<boolean> {
	const ok = await changePasswordDB(id, newPassword);
	if (ok) await invalidateCacheKeys({ id });
	return ok;
}
