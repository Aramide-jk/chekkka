import { z } from "zod";

export const updateProfileBodySchema = z
	.object({
		yearsExperience: z.number().int().min(0).max(80).optional(),
		specialisations: z.array(z.string().min(1).max(60)).max(20).optional(),
		bio: z.string().max(2000).optional(),
	})
	.strict();

export const applyFieldsSchema = z
	.object({
		yearsExperience: z.coerce.number().int().min(0).max(80),
		specialisations: z.string().optional(),
		bio: z.string().max(2000).optional(),
		city: z.string().max(80).optional(),
	})
	.strict();

export const setAvailabilityBodySchema = z
	.object({ toggleOn: z.boolean() })
	.strict();

const slotSchema = z.object({ time: z.string(), on: z.boolean() });
const daySchema = z.object({
	active: z.boolean(),
	slots: z.array(slotSchema),
});

export const setScheduleBodySchema = z
	.object({
		weekly: z.record(z.string(), daySchema),
		blockedDates: z.array(z.string().datetime()).optional(),
	})
	.strict();
