import "server-only";
import { listInspectorsByStatusDB } from "@/server/models/inspectorProfiles";

export type InspectorStatusFilter =
	| "pending"
	| "approved"
	| "rejected"
	| "suspended";

export default async function listAllInspectors({
	status,
	limit = 100,
	offset = 0,
}: {
	status?: InspectorStatusFilter;
	limit?: number;
	offset?: number;
}): Promise<unknown[]> {
	return listInspectorsByStatusDB({ status }, limit, offset);
}
