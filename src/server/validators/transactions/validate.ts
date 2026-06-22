import { z } from "zod";

export const initializeBodySchema = z
	.object({
		inspectionId: z.string().trim().min(1),
	})
	.strict();
