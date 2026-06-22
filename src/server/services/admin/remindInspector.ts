import "server-only";
import type { Types } from "mongoose";
import {
	ErrInspectionNotFound,
	ErrInvalidAction,
} from "@/server/constants/errors";
import { getInspectionByIdDB } from "@/server/models/inspections";
import emitNotification from "../notifications/emitNotification";

/**
 * Admin nudges an inspector whose report is overdue. Fires an in-app + SMS
 * notification reminding them to submit the report.
 */
export default async function remindInspector({
	id,
}: {
	id: string;
}): Promise<{ reminded: true }> {
	const inspection = await getInspectionByIdDB(id);
	if (!inspection) throw ErrInspectionNotFound;

	const inspectorId =
		(inspection.inspectorId as Types.ObjectId | undefined)?.toString() ??
		(
			inspection.assignedInspectorId as Types.ObjectId | undefined
		)?.toString();
	if (!inspectorId) throw ErrInvalidAction;

	await emitNotification({
		userId: inspectorId,
		kind: "inspector.report_overdue",
		title: "Report overdue",
		body: `Your report for the ${inspection.car.make} ${inspection.car.model} is past its deadline. Please submit it now.`,
		link: `/inspector/inspections/${id}/report`,
		channels: ["in_app", "sms"],
	}).catch(() => undefined);

	return { reminded: true };
}
