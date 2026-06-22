import "server-only";
import mongoose, { type HydratedDocument, Schema } from "mongoose";
import {
	databaseResponseTimeHistogram,
	IOperationType,
} from "@/server/metrics";

// One row, ever. This is the runtime-config table — modelled on the gkoi
// `siteConfigs` pattern: lean+projected reads on the hot path, env-constant
// fallback when the DB is unreachable, mutated only by admins.
export const SITE_CONFIG_SINGLETON_ID = "site_config_singleton";

export interface ISiteConfigGeneral {
	maintenanceMode: boolean;
	signupEnabled: boolean;
	bookingEnabled: boolean;
	inspectorApplicationsOpen: boolean;
	consultantChatEnabled: boolean;
}

export interface ISiteConfigPricing {
	standardInspectionPrice: number;
	premiumInspectionPrice: number;
	platformFee: number;
	inspectorPayoutPercent: number;
}

export interface ISiteConfigInspections {
	minPhotos: number;
	acceptWindowMinutes: number;
	sellerContactWindowHours: number;
	reportDeadlineHours: number;
	disputeAutoEscalateHours: number;
}

export interface ISiteConfigRateLimit {
	enabled: boolean;
	windowMs: number;
	maxRequests: number;
	killSwitch: boolean;
}

export interface ISiteConfigAudit {
	adminAuditEnabled: boolean;
	userAuditEnabled: boolean;
	adminRetentionDays: number;
	userRetentionDays: number;
}

export interface ISiteConfigData {
	general: ISiteConfigGeneral;
	pricing: ISiteConfigPricing;
	inspections: ISiteConfigInspections;
	rateLimit: ISiteConfigRateLimit;
	audit: ISiteConfigAudit;
}

// Patch shape used by admin writes — every section optional, and every field
// within a section also optional. Lets the Zod-validated body flow through
// without lossy assertions.
export type SiteConfigPatch = {
	[K in keyof ISiteConfigData]?: Partial<ISiteConfigData[K]>;
};

// Note: not extending `Document` here — the singleton uses a string _id, which
// conflicts with Mongoose 9's typed `Document<ObjectId,…>` generic. The
// hydrated type is exposed below for callers that need to work with a
// loaded mongoose instance.
export interface ISiteConfig extends ISiteConfigData {
	_id: string;
	updatedBy?: mongoose.Types.ObjectId | null;
	updatedAt: Date;
	createdAt: Date;
}

export type ISiteConfigDoc = HydratedDocument<ISiteConfig>;

// Fallback constants — these mirror the values the codebase used before
// `siteConfigs` existed (32k/52k pricing, 30 photos, 30-min accept window,
// etc.). They are returned verbatim when the DB lookup fails OR the doc has
// never been written.
export const SITE_CONFIG_DEFAULTS: ISiteConfigData = {
	general: {
		maintenanceMode: false,
		signupEnabled: true,
		bookingEnabled: true,
		inspectorApplicationsOpen: true,
		consultantChatEnabled: true,
	},
	pricing: {
		standardInspectionPrice: 32_000,
		premiumInspectionPrice: 52_000,
		platformFee: 2_500,
		inspectorPayoutPercent: 65,
	},
	inspections: {
		minPhotos: 30,
		acceptWindowMinutes: 30,
		sellerContactWindowHours: 24,
		reportDeadlineHours: 48,
		disputeAutoEscalateHours: 72,
	},
	rateLimit: {
		enabled: true,
		windowMs: 60_000,
		maxRequests: 100,
		killSwitch: false,
	},
	audit: {
		adminAuditEnabled: true,
		userAuditEnabled: true,
		adminRetentionDays: 90,
		userRetentionDays: 30,
	},
};

const generalSchema = new Schema<ISiteConfigGeneral>(
	{
		maintenanceMode: { type: Boolean, default: false },
		signupEnabled: { type: Boolean, default: true },
		bookingEnabled: { type: Boolean, default: true },
		inspectorApplicationsOpen: { type: Boolean, default: true },
		consultantChatEnabled: { type: Boolean, default: true },
	},
	{ _id: false },
);

const pricingSchema = new Schema<ISiteConfigPricing>(
	{
		standardInspectionPrice: { type: Number, default: 32_000, min: 0 },
		premiumInspectionPrice: { type: Number, default: 52_000, min: 0 },
		platformFee: { type: Number, default: 2_500, min: 0 },
		inspectorPayoutPercent: { type: Number, default: 65, min: 0, max: 100 },
	},
	{ _id: false },
);

const inspectionsSchema = new Schema<ISiteConfigInspections>(
	{
		minPhotos: { type: Number, default: 30, min: 1, max: 500 },
		acceptWindowMinutes: { type: Number, default: 30, min: 1 },
		sellerContactWindowHours: { type: Number, default: 24, min: 1 },
		reportDeadlineHours: { type: Number, default: 48, min: 1 },
		disputeAutoEscalateHours: { type: Number, default: 72, min: 1 },
	},
	{ _id: false },
);

const rateLimitSchema = new Schema<ISiteConfigRateLimit>(
	{
		enabled: { type: Boolean, default: true },
		windowMs: { type: Number, default: 60_000, min: 1_000 },
		maxRequests: { type: Number, default: 100, min: 1 },
		killSwitch: { type: Boolean, default: false },
	},
	{ _id: false },
);

const auditSchema = new Schema<ISiteConfigAudit>(
	{
		adminAuditEnabled: { type: Boolean, default: true },
		userAuditEnabled: { type: Boolean, default: true },
		adminRetentionDays: { type: Number, default: 90, min: 1, max: 3650 },
		userRetentionDays: { type: Number, default: 30, min: 1, max: 3650 },
	},
	{ _id: false },
);

const schema = new Schema<ISiteConfig>(
	{
		_id: { type: String, default: SITE_CONFIG_SINGLETON_ID },
		general: { type: generalSchema, default: () => ({}) },
		pricing: { type: pricingSchema, default: () => ({}) },
		inspections: { type: inspectionsSchema, default: () => ({}) },
		rateLimit: { type: rateLimitSchema, default: () => ({}) },
		audit: { type: auditSchema, default: () => ({}) },
		updatedBy: { type: Schema.Types.ObjectId, ref: "users", default: null },
	},
	{ timestamps: true, _id: false },
);

const COLLECTION = "siteconfigs";
export const SiteConfig =
	(mongoose.models[COLLECTION] as mongoose.Model<ISiteConfig>) ||
	mongoose.model<ISiteConfig>(COLLECTION, schema);

function timer(method: string, op: IOperationType = IOperationType.Read) {
	return databaseResponseTimeHistogram.startTimer({
		operation: op,
		collection: COLLECTION,
		method,
	});
}

const PROJECTION = {
	general: 1,
	pricing: 1,
	inspections: 1,
	rateLimit: 1,
	audit: 1,
	updatedBy: 1,
	updatedAt: 1,
	createdAt: 1,
};

/**
 * Hot-path read: lean, projected, no-throw. Returns `null` if the doc
 * doesn't exist yet OR the DB is unavailable; callers always layer the
 * env-constant fallback (`SITE_CONFIG_DEFAULTS`) on top.
 */
export async function getSiteConfigDB(): Promise<ISiteConfigData | null> {
	const stop = timer("getSiteConfigDB");
	try {
		const doc = await SiteConfig.findById(SITE_CONFIG_SINGLETON_ID)
			.select(PROJECTION)
			.lean<ISiteConfigData>()
			.exec();
		stop({ success: "true" });
		return doc ?? null;
	} catch {
		stop({ success: "false" });
		return null;
	}
}

/**
 * Admin write — used by the dashboard. Upserts the singleton row.
 */
export async function updateSiteConfigDB({
	patch,
	updatedBy,
}: {
	patch: SiteConfigPatch;
	updatedBy?: string;
}): Promise<ISiteConfigData> {
	const stop = timer("updateSiteConfigDB", IOperationType.Update);
	const set: Record<string, unknown> = {};
	for (const [section, values] of Object.entries(patch)) {
		if (!values || typeof values !== "object") continue;
		for (const [k, v] of Object.entries(values)) {
			set[`${section}.${k}`] = v;
		}
	}
	if (updatedBy) set.updatedBy = updatedBy;
	const doc = await SiteConfig.findByIdAndUpdate(
		SITE_CONFIG_SINGLETON_ID,
		{ $set: set },
		{ new: true, upsert: true, setDefaultsOnInsert: true },
	)
		.select(PROJECTION)
		.lean<ISiteConfigData>()
		.exec();
	stop({ success: "true" });
	// `doc` is non-null because of `upsert: true` + `new: true`.
	return doc as ISiteConfigData;
}
