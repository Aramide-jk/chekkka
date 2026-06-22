import "server-only";
import { type IUser, updateUserDB } from "@/server/models/users";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function updateUser({
	id,
	payload,
}: {
	id: string;
	payload: Partial<IUser>;
}): Promise<IUser | null> {
	const result = await updateUserDB(id, payload);
	if (!result) return null;

	await invalidateCacheKeys({
		id: result._id.toString(),
		email: result.email,
		username: result.username,
	});
	return result;
}
