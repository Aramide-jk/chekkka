import "server-only";
import crypto from "node:crypto";
import type { Types } from "mongoose";
import { ErrInspectionNotFound } from "@/server/constants/errors";
import { updateInspectionDB } from "@/server/models/inspections";
import {
	createTransactionDB,
	type ITransaction,
} from "@/server/models/transactions";
import getInspectionById from "../inspections/getInspectionById";
import invalidateInspectionsCacheKeys from "../inspections/utils/invalidateCacheKeys";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export interface IInitializeResult {
	transaction: ITransaction;
	redirectUrl: string;
	mock: true;
}

/**
 * Mock payment initialiser used until Paystack is wired up. Confirms the
 * inspection exists for the caller, records a paid transaction in the held
 * payout state, and nudges the inspection forward to `assigned` if it's
 * still pre-assignment.
 */
export default async function initialize({
	buyerId,
	inspectionId,
}: {
	buyerId: string;
	inspectionId: string;
}): Promise<IInitializeResult> {
	const ins = await getInspectionById({ id: inspectionId });
	if (!ins) throw ErrInspectionNotFound;
	if (ins.buyerId.toString() !== buyerId) throw ErrInspectionNotFound;

	const ref = `mock_${crypto.randomBytes(8).toString("hex")}`;
	const tx = await createTransactionDB({
		buyerId: ins.buyerId,
		inspectionId: ins._id,
		amount: ins.price + ins.platformFee,
		platformFee: ins.platformFee,
		paystackRef: ref,
		status: "paid",
		payoutStatus: "held",
		paidAt: new Date(),
	});

	await updateInspectionDB(ins._id.toString(), {
		status: ins.status === "submitted" ? "assigned" : ins.status,
		assignedAt: ins.assignedAt ?? new Date(),
	});

	const inspectorId = (
		ins.inspectorId as Types.ObjectId | undefined
	)?.toString();
	await invalidateInspectionsCacheKeys({
		id: ins._id.toString(),
		buyerId,
		inspectorId,
	});
	if (inspectorId) await invalidateCacheKeys({ inspectorId });

	return {
		transaction: tx,
		redirectUrl: `/inspections/${ins._id}`,
		mock: true,
	};
}
