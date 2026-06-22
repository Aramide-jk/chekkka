import "server-only";
import type { Types } from "mongoose";
import { ErrReportLocked } from "@/server/constants/errors";
import { adminLiveChannel, publish } from "@/server/lib/pubsub";
import type { IInspection, IReport } from "@/server/models/inspections";
import { updateInspectionDB } from "@/server/models/inspections";
import emitNotification from "../notifications/emitNotification";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function submitReport({
	id,
	current,
	report,
	lock,
}: {
	id: string;
	current: IInspection;
	report: IReport;
	lock: boolean;
}): Promise<IInspection | null> {
	if (current.reportLockedAt) throw ErrReportLocked;

	const all = [
		...report.exterior,
		...report.interior,
		...report.mechanical,
		...report.roadTest,
	];
	const summary = {
		...report.summary,
		passed: all.filter((i) => i.status === "good").length,
		minor: all.filter((i) => i.status === "minor").length,
		serious: all.filter((i) => i.status === "serious").length,
	};

	const patch: Partial<IInspection> = {
		report: { ...report, summary } as IReport,
	};
	if (lock) {
		patch.status = "completed";
		patch.reportLockedAt = new Date();
		patch.completedAt = new Date();
	} else {
		patch.status =
			current.status === "completed"
				? current.status
				: "report_processing";
	}

	const updated = await updateInspectionDB(id, patch);
	if (!updated) return null;

	const buyerId = (updated.buyerId as Types.ObjectId).toString();
	const inspectorId =
		(updated.inspectorId as Types.ObjectId | undefined)?.toString() ??
		(updated.assignedInspectorId as Types.ObjectId | undefined)?.toString();
	await invalidateCacheKeys({ id, buyerId, inspectorId });

	await publish(adminLiveChannel(), {
		kind: "report_filed",
		inspectionId: id,
		verdict: report.verdict,
	});

	if (lock) {
		await emitNotification({
			userId: buyerId,
			kind: "inspection.report_ready",
			title: "Your inspection report is ready",
			body: "Tap to read the full report and verdict.",
			link: `/inspections/${id}`,
		}).catch(() => undefined);
	}

	return updated;
}
