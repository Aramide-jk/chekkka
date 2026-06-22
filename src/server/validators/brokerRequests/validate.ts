import { z } from "zod";

export const createBrokerRequestBodySchema = z
	.object({
		inspectionId: z.string().min(1),
		budget: z.number().int().positive().max(1_000_000_000),
		paymentMethod: z.string().trim().min(1).max(120),
		deliveryAddress: z.string().trim().min(1).max(500),
		instructions: z.string().trim().max(2000).optional(),
	})
	.strict();

export type CreateBrokerRequestBody = z.infer<
	typeof createBrokerRequestBodySchema
>;
