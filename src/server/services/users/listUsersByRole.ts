import "server-only";
import { type IUser, listUsersByRoleDB } from "@/server/models/users";
import type { UserRole } from "@/server/types";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({
	role,
	status,
	limit,
	offset,
}: {
	role: UserRole | "*";
	status?: string;
	limit: number | "*";
	offset: number | "*";
}) {
	return `services:users:listUsersByRole:${role}:${status ?? "any"}:${limit}:${offset}`;
}

const memo = makeInProcessCache<IUser[]>();
export function clearInProcessCache(): void {
	memo.clear();
}

export default async function listUsersByRole({
	role,
	status,
	limit = 50,
	offset = 0,
	refreshCache,
}: {
	role: UserRole;
	status?: string;
	limit?: number;
	offset?: number;
	refreshCache?: boolean;
}): Promise<IUser[]> {
	const result = await withDualLayerCache<IUser[]>({
		memo,
		memoKey: `${role}:${status ?? "any"}:${limit}:${offset}`,
		redisKey: getQueryKey({ role, status, limit, offset }),
		redisTtlSeconds: 60,
		refreshCache,
		loader: async () => {
			const filter = status ? ({ status } as Partial<IUser>) : {};
			return listUsersByRoleDB(role, filter, limit, offset);
		},
	});
	return result ?? [];
}
