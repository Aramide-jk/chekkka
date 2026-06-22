import "server-only";
import {
	type IInspection,
	listAllInspectionsDB,
} from "@/server/models/inspections";
import type { InspectionStatus } from "@/server/types";

export default async function listAll({
	status,
	limit = 100,
	offset = 0,
}: {
	status?: InspectionStatus;
	limit?: number;
	offset?: number;
}): Promise<IInspection[]> {
	// No dual-layer cache here on purpose: the admin browse view is low-traffic
	// and benefits from always-fresh data after reassign/cancel actions, which
	// would otherwise need extra cache-key plumbing.
	return listAllInspectionsDB({ status }, limit, offset);
}
