import "server-only";
import type { IInspection } from "@/server/models/inspections";
import {
	dashboardStatsForBuyer,
	type IBuyerDashboardStats,
	listForBuyer,
} from "../inspections";

export interface IBuyerDashboard {
	stats: IBuyerDashboardStats;
	recent: IInspection[];
	active: IInspection[];
}

export default async function getBuyerDashboard({
	buyerId,
}: {
	buyerId: string;
}): Promise<IBuyerDashboard> {
	const [stats, recent, mixed] = await Promise.all([
		dashboardStatsForBuyer({ buyerId }),
		listForBuyer({ buyerId, status: "completed", limit: 5 }),
		listForBuyer({ buyerId, limit: 5 }),
	]);
	const active = mixed.filter(
		(i) => i.status !== "completed" && i.status !== "declined",
	);
	return { stats, recent, active };
}
