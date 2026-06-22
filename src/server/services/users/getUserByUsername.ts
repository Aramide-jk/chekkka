import "server-only";
import { getUserByUsernameDB, type IUser } from "@/server/models/users";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({ username }: { username: string }) {
	return `services:users:getUserByUsername:${username.toLowerCase()}`;
}

const memo = makeInProcessCache<IUser>();
export function clearInProcessCache(username?: string): void {
	memo.clear(username?.toLowerCase());
}

export default async function getUserByUsername({
	username,
	refreshCache,
}: {
	username: string;
	refreshCache?: boolean;
}): Promise<IUser | null> {
	return withDualLayerCache<IUser>({
		memo,
		memoKey: username.toLowerCase(),
		redisKey: getQueryKey({ username }),
		refreshCache,
		loader: () => getUserByUsernameDB(username),
	});
}
