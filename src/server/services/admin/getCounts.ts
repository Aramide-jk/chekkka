import "server-only";
import type { AuthResult } from "@/server/lib/auth";
import { hasPermission, type Permission } from "@/server/lib/permissions";
import { countBrokerRequestsDB } from "@/server/models/brokerRequests";
import { countDisputesDB } from "@/server/models/disputes";
import {
	countInspectionsDB,
	countOverdueInspectionsDB,
} from "@/server/models/inspections";
import { platformRevenueSumDB } from "@/server/models/transactions";
import { countUsersByRoleDB } from "@/server/models/users";

export interface IAdminCounts {
	inspectionsManage: number;
	inspectorsActive: number;
	inspectorsPending: number;
	specialRequests: number;
	liveInspections: number;
	disputesOpen: number;
	brokerRequestsPending: number;
	overdueReports: number;
	// Admin-only stats row
	inspectionsThisWeek: number;
	disputesResolvedPercent: number;
	revenueMtdNaira: number;
}

const ACTIVE_INSPECTION_STATUSES = [
	"submitted",
	"assigned",
	"scheduled",
	"in_progress",
	"report_processing",
] as const;

/**
 * Single round trip that powers the admin dashboard tile/stat counts. Each
 * count is gated on the same `*.view` permission the matching tile checks
 * client-side — a manager without that permission gets `0` and the tile is
 * hidden anyway. Returning a flat shape lets the dashboard read every number
 * without conditional plumbing.
 */
export default async function getCounts(
	auth: Pick<AuthResult, "userId" | "role">,
): Promise<IAdminCounts> {
	const can = async (perm: Permission) => hasPermission(auth, perm);

	const now = new Date();
	const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	const [
		liveAllowed,
		inspectorsAllowed,
		specialAllowed,
		disputesAllowed,
		brokerAllowed,
		overdueAllowed,
	] = await Promise.all([
		can("live.view"),
		can("inspectors.view"),
		can("special_requests.view"),
		can("disputes.view"),
		can("broker_requests.view"),
		can("overdue.view"),
	]);

	const [
		inspectionsManage,
		inspectorsActive,
		inspectorsPending,
		specialRequests,
		liveInspections,
		disputesOpen,
		disputesTotal,
		brokerRequestsPending,
		overdueReports,
		inspectionsThisWeek,
		revenueMtdNaira,
	] = await Promise.all([
		liveAllowed
			? countInspectionsDB({
					status: { $in: [...ACTIVE_INSPECTION_STATUSES] },
				})
			: 0,
		inspectorsAllowed
			? countUsersByRoleDB("inspector", { status: "approved" })
			: 0,
		inspectorsAllowed
			? countUsersByRoleDB("inspector", { status: "pending" })
			: 0,
		specialAllowed
			? countInspectionsDB({ inspectionType: "special_request" })
			: 0,
		liveAllowed ? countInspectionsDB({ status: "in_progress" }) : 0,
		disputesAllowed ? countDisputesDB({ status: "open" }) : 0,
		auth.role === "admin" ? countDisputesDB() : 0,
		brokerAllowed ? countBrokerRequestsDB({ pending: true }) : 0,
		overdueAllowed ? countOverdueInspectionsDB() : 0,
		auth.role === "admin"
			? countInspectionsDB({ createdAfter: oneWeekAgo })
			: 0,
		auth.role === "admin" ? platformRevenueSumDB(monthStart) : 0,
	]);

	const disputesResolvedPercent =
		disputesTotal > 0
			? Math.round(((disputesTotal - disputesOpen) / disputesTotal) * 100)
			: 0;

	return {
		inspectionsManage,
		inspectorsActive,
		inspectorsPending,
		specialRequests,
		liveInspections,
		disputesOpen,
		brokerRequestsPending,
		overdueReports,
		inspectionsThisWeek,
		disputesResolvedPercent,
		revenueMtdNaira,
	};
}
