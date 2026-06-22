import "server-only";
import type { Types } from "mongoose";
import {
	type DisputeResolution,
	getDisputeByIdDB,
	type IDispute,
	updateDisputeDB,
} from "@/server/models/disputes";
import emitNotification from "../notifications/emitNotification";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

/**
 * Admin resolves a dispute in favour of the buyer, the inspector, or simply
 * closes it. The transaction-level refund/payout side-effects are owned by the
 * payments domain; here we record the outcome and notify the buyer who raised
 * it.
 */
export default async function resolveDispute({
	id,
	resolution,
}: {
	id: string;
	resolution: Exclude<DisputeResolution, null>;
}): Promise<IDispute | null> {
	const dispute = await getDisputeByIdDB(id);
	if (!dispute) return null;

	const updated = await updateDisputeDB(id, {
		status: resolution === "closed" ? "closed" : "resolved",
		resolution,
	});
	if (!updated) return null;

	await invalidateCacheKeys();

	const buyerId = (updated.raisedBy as Types.ObjectId).toString();
	const body =
		resolution === "buyer"
			? "Your dispute was resolved in your favour."
			: resolution === "inspector"
				? "Your dispute was reviewed and the report was upheld."
				: "Your dispute has been closed.";
	await emitNotification({
		userId: buyerId,
		kind: "dispute.resolved",
		title: "Dispute resolved",
		body,
		link: `/inspections/${(updated.inspectionId as Types.ObjectId).toString()}`,
	}).catch(() => undefined);

	return updated;
}
