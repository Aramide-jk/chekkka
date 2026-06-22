import "server-only";
import type { IUser } from "@/server/models/users";
import type { UserRole } from "@/server/types";
import createUser from "../users/createUser";

export interface ISignupInput {
	fullName: string;
	username: string;
	email: string;
	phone: string;
	password: string;
	role: UserRole;
	city?: string;
}

export default async function signup({
	payload,
}: {
	payload: ISignupInput;
}): Promise<IUser> {
	const status = payload.role === "inspector" ? "pending" : "active";
	return createUser({ payload: { ...payload, status } });
}
