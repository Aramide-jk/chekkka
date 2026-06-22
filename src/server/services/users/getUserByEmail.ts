import "server-only";
import { getUserByEmailDB, type IUser } from "@/server/models/users";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({ email }: { email: string }) {
	return `services:users:getUserByEmail:${email.toLowerCase()}`;
}

const memo = makeInProcessCache<IUser>();
export function clearInProcessCache(email?: string): void {
	memo.clear(email?.toLowerCase());
}

export default async function getUserByEmail({
	email,
	refreshCache,
}: {
	email: string;
	refreshCache?: boolean;
}): Promise<IUser | null> {
	return withDualLayerCache<IUser>({
		memo,
		memoKey: email.toLowerCase(),
		redisKey: getQueryKey({ email }),
		refreshCache,
		loader: () => getUserByEmailDB(email),
	});
}
