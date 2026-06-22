import "server-only";
import type { Types } from "mongoose";
import {
	type IBrokerRequest,
	updateBrokerRequestDB,
} from "@/server/models/brokerRequests";
import createChat from "../chats/createChat";
import emitNotification from "../notifications/emitNotification";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

/**
 * Admin assigns a broker to a pending request. Sets the broker, advances the
 * status to `broker_assigned`, opens the buyer↔broker chat, and notifies the
 * buyer.
 */
export default async function assignBroker({
	requestId,
	brokerId,
}: {
	requestId: string;
	brokerId: string;
}): Promise<IBrokerRequest | null> {
	const updated = await updateBrokerRequestDB(requestId, {
		brokerId: brokerId as unknown as Types.ObjectId,
		status: "broker_assigned",
	});
	if (!updated) return null;

	const buyerId = (updated.buyerId as Types.ObjectId).toString();

	// Open the broker chat so the buyer can talk to their assigned broker.
	await createChat({
		payload: {
			buyerId: updated.buyerId as Types.ObjectId,
			counterpartyId: brokerId as unknown as Types.ObjectId,
			chatType: "broker",
			status: "active",
		},
	}).catch(() => undefined);

	await invalidateCacheKeys({ buyerId });

	await emitNotification({
		userId: buyerId,
		kind: "broker.assigned",
		title: "Broker assigned",
		body: "Your Chekka broker is ready to start. Open the chat to begin.",
		link: "/chat",
	}).catch(() => undefined);

	return updated;
}
