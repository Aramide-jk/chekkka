import "server-only";
import type { Types } from "mongoose";
import {
	ErrInspectionNotFound,
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
 * Admin reassignment: move an inspection to a different inspector. Used when
 * the originally assigned inspector declines, ghosts the offer, or has to be
 * pulled off the job. Resets status back to `assigned` so the new inspector
 * sees it as a fresh offer.
 */
export default async function reassignInspection({
	id,
	inspectorId,
}: {
	id: string;
	inspectorId: string;
}): Promise<IInspection> {
	const previous = await getInspectionByIdDB(id);
	if (!previous) throw ErrInspectionNotFound;

	const inspector = await getUserByIdDB(inspectorId);
	if (!inspector || inspector.role !== "inspector") throw ErrUserNotFound;

	// Direct findOneAndUpdate so we can $unset acceptedAt — Mongoose ignores
	// `undefined` values inside $set, which would leave a stale accept
	// timestamp on a freshly-reassigned job.
	const updated = await Inspection.findOneAndUpdate(
		{ _id: id, deleted: false },
		{
			$set: {
				assignedInspectorId: inspectorId,
				assignedAt: new Date(),
				status: "assigned",
			},
			$unset: { acceptedAt: 1 },
		},
		{ new: true },
	).exec();
	if (!updated) throw ErrInspectionNotFound;

	const buyerId = (updated.buyerId as Types.ObjectId).toString();
	const previousInspectorId = (
		previous.assignedInspectorId as Types.ObjectId | undefined
	)?.toString();

	await invalidateInspectionsCache({
		id,
		buyerId,
		inspectorId,
	});
	if (previousInspectorId && previousInspectorId !== inspectorId) {
		await invalidateInspectionsCache({ inspectorId: previousInspectorId });
	}

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
		body: "A new inspector has picked up your job.",
		link: `/inspections/${id}`,
	}).catch(() => undefined);

	return updated;
}
