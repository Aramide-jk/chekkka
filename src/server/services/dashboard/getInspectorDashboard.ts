import "server-only";
import type { IInspection } from "@/server/models/inspections";
import type { IInspectorProfile } from "@/server/models/inspectorProfiles";
import {
	dashboardStatsForInspector,
	type IInspectorDashboardStats,
	listForInspector,
} from "../inspections";
import { getByUserId } from "../inspectorProfiles";
import { getSiteConfig } from "../siteConfigs";
import { inspectorEarnings } from "../transactions";

export interface IInspectorDashboard {
	stats: IInspectorDashboardStats;
	profile: IInspectorProfile | null;
	jobs: IInspection[];
	earnings: Awaited<ReturnType<typeof inspectorEarnings>>;
	// Admin-configurable payout share (e.g. 65) — surfaced so the client can
	// display the same per-job payout the job-detail page shows.
	payoutPercent: number;
}

export default async function getInspectorDashboard({
	userId,
}: {
	userId: string;
}): Promise<IInspectorDashboard> {
	const [stats, profile, jobs, earnings, config] = await Promise.all([
		dashboardStatsForInspector({ inspectorId: userId }),
		getByUserId({ userId }),
		listForInspector({ inspectorId: userId, limit: 10 }),
		inspectorEarnings({ inspectorId: userId }),
		getSiteConfig(),
	]);
	return {
		stats,
		profile,
		jobs,
		earnings,
		payoutPercent: config.pricing.inspectorPayoutPercent,
	};
}
