import "server-only";
import getUserById from "../users/getUserById";
import { type IManagerSummary, toManagerSummary } from "./listManagers";

export default async function getManager({
	id,
}: {
	id: string;
}): Promise<IManagerSummary | null> {
	const u = await getUserById({ id });
	if (!u || u.role !== "manager") return null;
	return toManagerSummary(u);
}
