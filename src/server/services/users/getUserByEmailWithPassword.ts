import "server-only";
import {
	getUserByEmailWithPasswordDB,
	type IUser,
} from "@/server/models/users";

/**
 * Intentionally uncached: returns the hashed password field for credential
 * verification. Caching this would leak sensitive material into Redis.
 */
export default async function getUserByEmailWithPassword({
	email,
}: {
	email: string;
}): Promise<IUser | null> {
	return getUserByEmailWithPasswordDB(email);
}
