import "server-only";
import { getUserByIdDB, type IUser } from "@/server/models/users";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({ id }: { id: string }) {
	return `services:users:getUserById:${id}`;
}

const memo = makeInProcessCache<IUser>();
export function clearInProcessCache(id?: string): void {
	memo.clear(id);
}

export default async function getUserById({
	id,
	refreshCache,
}: {
	id: string;
	refreshCache?: boolean;
}): Promise<IUser | null> {
	return withDualLayerCache<IUser>({
		memo,
		memoKey: id,
		redisKey: getQueryKey({ id }),
		refreshCache,
		loader: () => getUserByIdDB(id),
	});
}
