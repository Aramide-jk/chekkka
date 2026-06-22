import "server-only";
import { createUserDB, type IUser } from "@/server/models/users";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function createUser({
	payload,
}: {
	payload: Partial<IUser>;
}): Promise<IUser> {
	const user = await createUserDB(payload);
	await invalidateCacheKeys({
		id: user._id.toString(),
		email: user.email,
		username: user.username,
	});
	return user;
}
