import { z } from "zod";

export const updateMeBodySchema = z
	.object({
		fullName: z.string().trim().min(2).max(120).optional(),
		phone: z.string().trim().min(7).max(20).optional(),
		city: z.string().trim().max(80).optional(),
		avatar: z.string().max(500).optional(),
		onboardingCompleted: z.boolean().optional(),
	})
	.strict();
