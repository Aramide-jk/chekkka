import "server-only";
import type { Types } from "mongoose";
import {
	ErrInspectionNotFound,
	ErrInvalidAction,
	ErrUserNotFound,
} from "@/server/constants/errors";
import {
	getInspectionByIdDB,
	type IInspection,
	Inspection,
} from "@/server/models/inspections";
import { getUserByIdDB } from "@/server/models/users";
import invalidateInspectionsCache from "../inspections/utils/invalidateCacheKeys";
import emitNotification from "../notifications/emitNotification";

/**
 * Admin handles a special-request inspection: sets the custom price and assigns
 * an inspector, moving it straight to `assigned` (it skips Steps 3–5 of the
 * normal booking flow). Buyer and inspector are both notified.
 */
export default async function assignSpecialRequest({
	id,
	inspectorId,
	customPrice,
}: {
	id: string;
	inspectorId: string;
	customPrice: number;
}): Promise<IInspection> {
	const inspection = await getInspectionByIdDB(id);
	if (!inspection) throw ErrInspectionNotFound;
	if (inspection.inspectionType !== "special_request") throw ErrInvalidAction;

	const inspector = await getUserByIdDB(inspectorId);
	if (!inspector || inspector.role !== "inspector") throw ErrUserNotFound;

	const updated = await Inspection.findOneAndUpdate(
		{ _id: id, deleted: false },
		{
			$set: {
				assignedInspectorId: inspectorId,
				assignedAt: new Date(),
				price: customPrice,
				status: "assigned",
			},
		},
		{ new: true },
	).exec();
	if (!updated) throw ErrInspectionNotFound;

	const buyerId = (updated.buyerId as Types.ObjectId).toString();
	await invalidateInspectionsCache({ id, buyerId, inspectorId });

	await emitNotification({
		userId: inspectorId,
		kind: "inspector.job_assigned",
		title: "New job assigned",
		body: `${updated.car.make} ${updated.car.model} in ${updated.car.city}.`,
		link: `/inspector/inspections/${id}`,
	}).catch(() => undefined);

	await emitNotification({
		userId: buyerId,
		kind: "inspection.status.assigned",
		title: "Inspector assigned",
		body: "Your special request has been assigned to an inspector.",
		link: `/inspections/${id}`,
	}).catch(() => undefined);

	return updated;
}
