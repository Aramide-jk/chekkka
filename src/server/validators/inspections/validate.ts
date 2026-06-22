import { z } from "zod";

export const createInspectionBodySchema = z
	.object({
		inspectionType: z.enum(["standard", "premium", "special_request"]),
		car: z.object({
			make: z.string().trim().min(1).max(60),
			model: z.string().trim().min(1).max(60),
			year: z.number().int().min(1980).max(2100),
			color: z.string().trim().max(40).optional(),
			sellerType: z.enum(["dealership", "private"]),
			city: z.string().trim().min(1).max(60),
			address: z.string().trim().min(1).max(200),
			sellerContact: z.string().trim().max(40).optional(),
			notes: z.string().trim().max(1000).optional(),
		}),
		assignedInspectorId: z.string().trim().optional(),
		scheduledFor: z.string().datetime().optional(),
		slot: z.string().trim().max(20).optional(),
	})
	.strict();

export const updateInspectionBodySchema = z
	.object({
		status: z
			.enum([
				"submitted",
				"assigned",
				"declined",
				"scheduled",
				"in_progress",
				"report_processing",
				"completed",
			])
			.optional(),
		currentSection: z.string().trim().max(40).optional(),
		sellerContactedAt: z.string().datetime().optional(),
		acceptedAt: z.string().datetime().optional(),
		startedAt: z.string().datetime().optional(),
		completedPhysicalAt: z.string().datetime().optional(),
		completedAt: z.string().datetime().optional(),
		scheduledFor: z.string().datetime().optional(),
		slot: z.string().trim().max(20).optional(),
	})
	.strict();

const checklistItem = z.object({
	label: z.string().min(1).max(120),
	status: z.enum(["good", "minor", "serious", "n/a"]),
	comment: z.string().max(2000).optional(),
});

export const reportBodySchema = z
	.object({
		report: z.object({
			overview: z
				.object({
					year: z.number().optional(),
					make: z.string().optional(),
					model: z.string().optional(),
					mileage: z.string().optional(),
					transmission: z.string().optional(),
					vin: z.string().optional(),
					interiorType: z.string().optional(),
					interiorColor: z.string().optional(),
					bodyColor: z.string().optional(),
					engine: z.string().optional(),
					driveType: z.string().optional(),
					fuelType: z.string().optional(),
				})
				.partial()
				.default({}),
			exterior: z.array(checklistItem).default([]),
			interior: z.array(checklistItem).default([]),
			mechanical: z.array(checklistItem).default([]),
			roadTest: z.array(checklistItem).default([]),
			verdict: z.enum(["good", "caution", "danger"]),
			summary: z
				.object({
					passed: z.number().int().min(0).default(0),
					minor: z.number().int().min(0).default(0),
					serious: z.number().int().min(0).default(0),
					written: z.string().max(4000).default(""),
					fixes: z
						.array(
							z.object({
								label: z.string(),
								priority: z.enum(["Low", "Medium", "High"]),
							}),
						)
						.default([]),
				})
				.default({
					passed: 0,
					minor: 0,
					serious: 0,
					written: "",
					fixes: [],
				}),
		}),
		lock: z.boolean().default(true),
	})
	.strict();

export const photoSectionSchema = z.enum([
	"exterior",
	"interior",
	"engine",
	"test_drive",
	"other",
]);
