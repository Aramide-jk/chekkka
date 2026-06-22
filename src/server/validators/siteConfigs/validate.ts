import { z } from "zod";

const generalSchema = z
	.object({
		maintenanceMode: z.boolean().optional(),
		signupEnabled: z.boolean().optional(),
		bookingEnabled: z.boolean().optional(),
		inspectorApplicationsOpen: z.boolean().optional(),
		consultantChatEnabled: z.boolean().optional(),
	})
	.strict();

const pricingSchema = z
	.object({
		standardInspectionPrice: z
			.number()
			.int()
			.min(0)
			.max(10_000_000)
			.optional(),
		premiumInspectionPrice: z
			.number()
			.int()
			.min(0)
			.max(10_000_000)
			.optional(),
		platformFee: z.number().int().min(0).max(10_000_000).optional(),
		inspectorPayoutPercent: z.number().int().min(0).max(100).optional(),
	})
	.strict();

const inspectionsSchema = z
	.object({
		minPhotos: z.number().int().min(1).max(500).optional(),
		acceptWindowMinutes: z
			.number()
			.int()
			.min(1)
			.max(60 * 24)
			.optional(),
		sellerContactWindowHours: z
			.number()
			.int()
			.min(1)
			.max(24 * 30)
			.optional(),
		reportDeadlineHours: z
			.number()
			.int()
			.min(1)
			.max(24 * 30)
			.optional(),
		disputeAutoEscalateHours: z
			.number()
			.int()
			.min(1)
			.max(24 * 60)
			.optional(),
	})
	.strict();

const rateLimitSchema = z
	.object({
		enabled: z.boolean().optional(),
		windowMs: z
			.number()
			.int()
			.min(1_000)
			.max(60 * 60 * 1000)
			.optional(),
		maxRequests: z.number().int().min(1).max(1_000_000).optional(),
		killSwitch: z.boolean().optional(),
	})
	.strict();

const auditSchema = z
	.object({
		adminAuditEnabled: z.boolean().optional(),
		userAuditEnabled: z.boolean().optional(),
		adminRetentionDays: z.number().int().min(1).max(3650).optional(),
		userRetentionDays: z.number().int().min(1).max(3650).optional(),
	})
	.strict();

export const updateSiteConfigBodySchema = z
	.object({
		general: generalSchema.optional(),
		pricing: pricingSchema.optional(),
		inspections: inspectionsSchema.optional(),
		rateLimit: rateLimitSchema.optional(),
		audit: auditSchema.optional(),
	})
	.strict()
	.refine(
		(v) => Object.keys(v).some((k) => v[k as keyof typeof v] !== undefined),
		{ message: "At least one section must be provided" },
	);

export type UpdateSiteConfigBody = z.infer<typeof updateSiteConfigBodySchema>;
