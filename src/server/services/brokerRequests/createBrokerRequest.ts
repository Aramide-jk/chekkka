import "server-only";
import type { Types } from "mongoose";
import {
	createBrokerRequestDB,
	type IBrokerRequest,
} from "@/server/models/brokerRequests";
import { getInspectionByIdDB } from "@/server/models/inspections";
import emitNotification from "../notifications/emitNotification";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export interface ICreateBrokerRequestInput {
	buyerId: string;
	inspectionId: string;
	budget: number;
	paymentMethod: string;
	deliveryAddress: string;
	instructions?: string;
}

/**
 * A buyer who has read their report asks Chekka to broker the purchase. The
 * request lands with `status: null` (no broker assigned yet) and surfaces in
 * the admin broker-requests queue, where an admin assigns a broker.
 */
export default async function createBrokerRequest({
	payload,
}: {
	payload: ICreateBrokerRequestInput;
}): Promise<IBrokerRequest | null> {
	// Guard: the inspection must exist and belong to the requesting buyer.
	const inspection = await getInspectionByIdDB(payload.inspectionId);
	if (!inspection) return null;
	if (inspection.buyerId.toString() !== payload.buyerId) return null;

	const request = await createBrokerRequestDB({
		buyerId: payload.buyerId as unknown as Types.ObjectId,
		inspectionId: payload.inspectionId as unknown as Types.ObjectId,
		budget: payload.budget,
		paymentMethod: payload.paymentMethod,
		deliveryAddress: payload.deliveryAddress,
		instructions: payload.instructions,
		status: null,
	});

	await invalidateCacheKeys({ buyerId: payload.buyerId });

	await emitNotification({
		userId: payload.buyerId,
		kind: "broker.request_received",
		title: "Broker request received",
		body: "A Chekka broker will be assigned to your purchase shortly.",
		link: `/inspections/${payload.inspectionId}`,
	}).catch(() => undefined);

	return request;
}
