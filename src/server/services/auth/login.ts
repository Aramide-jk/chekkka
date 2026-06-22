import "server-only";
import {
	ErrAccountSuspended,
	ErrInvalidCredentials,
} from "@/server/constants/errors";
import type { IUser } from "@/server/models/users";
import getUserByEmailWithPassword from "../users/getUserByEmailWithPassword";

export default async function login({
	email,
	password,
}: {
	email: string;
	password: string;
}): Promise<IUser> {
	const user = await getUserByEmailWithPassword({ email });
	if (!user) throw ErrInvalidCredentials;

	// Pending manager invites have no password until accept. bcrypt.compare
	// would error on an undefined hash — surface that as a normal 401 so we
	// don't leak the existence of the email AND keep the response shape
	// consistent with "wrong password".
	if (!user.password) throw ErrInvalidCredentials;

	const match = await user.comparePassword(password);
	if (!match) throw ErrInvalidCredentials;

	if (user.status === "suspended") throw ErrAccountSuspended;
	// Pending/rejected managers are locked out of login until the invite
	// handshake completes — even if a password happened to be set somehow.
	if (user.role === "manager" && user.status === "pending") {
		throw ErrInvalidCredentials;
	}
	if (user.role === "manager" && user.status === "rejected") {
		throw ErrInvalidCredentials;
	}

	return user;
}
