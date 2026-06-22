import "server-only";
import { redisDeleteKeys } from "@/server/databases/redis";
import {
	clearInProcessCache as clearByEmail,
	getQueryKey as getKeyByEmail,
} from "../getUserByEmail";
import {
	clearInProcessCache as clearById,
	getQueryKey as getKeyById,
} from "../getUserById";
import {
	clearInProcessCache as clearByUsername,
	getQueryKey as getKeyByUsername,
} from "../getUserByUsername";
import {
	clearInProcessCache as clearListByRole,
	getQueryKey as getKeyListByRole,
} from "../listUsersByRole";

export default async function invalidateCacheKeys({
	id,
	email,
	username,
}: {
	id: string;
	email?: string;
	username?: string;
}): Promise<void> {
	clearById(id);
	if (email) clearByEmail(email);
	if (username) clearByUsername(username);
	clearListByRole();

	await redisDeleteKeys(
		getKeyById({ id }),
		...(email ? [getKeyByEmail({ email })] : []),
		...(username ? [getKeyByUsername({ username })] : []),
		getKeyListByRole({ role: "*", status: "*", limit: "*", offset: "*" }),
	);
}
