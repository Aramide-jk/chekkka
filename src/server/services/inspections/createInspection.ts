import "server-only";
import type { Types } from "mongoose";
import {
	createInspectionDB,
	type IInspection,
} from "@/server/models/inspections";
import type { InspectionStatus, InspectionType } from "@/server/types";
import emitNotification from "../notifications/emitNotification";
import getSiteConfig from "../siteConfigs/getSiteConfig";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export interface ICreateInspectionInput {
	buyerId: string;
	inspectionType: InspectionType;
	car: IInspection["car"];
	assignedInspectorId?: string;
	scheduledFor?: string;
	slot?: string;
}

export default async function createInspection({
	payload,
}: {
	payload: ICreateInspectionInput;
}): Promise<IInspection> {
	// Pricing is admin-tunable via /admin/settings. Falls back to the
	// hard-coded defaults baked into `SITE_CONFIG_DEFAULTS` if the
	// siteConfigs row hasn't been written yet.
	const config = await getSiteConfig();
	const priceByType: Record<InspectionType, number> = {
		standard: config.pricing.standardInspectionPrice,
		premium: config.pricing.premiumInspectionPrice,
		special_request: 0,
	};
	const price = priceByType[payload.inspectionType];
	const inspection = await createInspectionDB({
		buyerId: payload.buyerId as unknown as Types.ObjectId,
		inspectionType: payload.inspectionType,
		car: payload.car,
		price,
		platformFee: config.pricing.platformFee,
		status: "submitted",
		assignedInspectorId:
			payload.assignedInspectorId as unknown as Types.ObjectId,
		scheduledFor: payload.scheduledFor
			? new Date(payload.scheduledFor)
			: undefined,
		slot: payload.slot,
		...(payload.assignedInspectorId
			? {
					assignedAt: new Date(),
					status: "assigned" as InspectionStatus,
				}
			: {}),
	});

	await invalidateCacheKeys({
		id: inspection._id.toString(),
		buyerId: payload.buyerId,
		inspectorId: payload.assignedInspectorId,
	});

	await emitNotification({
		userId: payload.buyerId,
		kind: "inspection.booking_confirmed",
		title: "Booking confirmed",
		body: `${payload.car.make} ${payload.car.model} — we're locating an inspector.`,
		link: `/inspections/${inspection._id.toString()}`,
	}).catch(() => undefined);

	if (payload.assignedInspectorId) {
		await emitNotification({
			userId: payload.assignedInspectorId,
			kind: "inspector.job_assigned",
			title: "New job assigned",
			body: `${payload.car.make} ${payload.car.model} in ${payload.car.city}.`,
			link: `/inspector/inspections/${inspection._id.toString()}`,
		}).catch(() => undefined);
	}

	return inspection;
}
