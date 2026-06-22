import "server-only";
import type { Types } from "mongoose";
import { ErrInspectionNotFound } from "@/server/constants/errors";
import {
	type IInspection,
	updateInspectionDB,
} from "@/server/models/inspections";
import invalidateInspectionsCache from "../inspections/utils/invalidateCacheKeys";
import emitNotification from "../notifications/emitNotification";

/**
 * Admin cancel: soft-deletes the inspection so it no longer appears in any
 * buyer/inspector list. The inspection document is preserved (deleted=true)
 * for audit purposes — no row is removed from MongoDB.
 */
export default async function cancelInspection({
	id,
	reason,
}: {
	id: string;
	reason?: string;
}): Promise<IInspection> {
	const updated = await updateInspectionDB(id, {
		deleted: true,
	});
	if (!updated) throw ErrInspectionNotFound;

	const buyerId = (updated.buyerId as Types.ObjectId).toString();
	const inspectorId =
		(updated.inspectorId as Types.ObjectId | undefined)?.toString() ??
		(updated.assignedInspectorId as Types.ObjectId | undefined)?.toString();

	await invalidateInspectionsCache({ id, buyerId, inspectorId });

	await emitNotification({
		userId: buyerId,
		kind: "inspection.cancelled",
		title: "Inspection cancelled",
		body: reason || "Your inspection has been cancelled by an admin.",
		link: "/dashboard",
	}).catch(() => undefined);

	if (inspectorId) {
		await emitNotification({
			userId: inspectorId,
			kind: "inspector.job_cancelled",
			title: "Job cancelled",
			body: `${updated.car.make} ${updated.car.model} — cancelled by admin.`,
			link: "/inspector/dashboard",
		}).catch(() => undefined);
	}

	return updated;
}
