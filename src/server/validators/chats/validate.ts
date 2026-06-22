import { z } from "zod";

export const createChatBodySchema = z
	.object({
		chatType: z.enum(["consultant", "broker"]).default("consultant"),
		context: z.string().max(200).optional(),
	})
	.strict();

export const recommendationSchema = z.object({
	inspectionType: z.string().trim().min(1).max(60),
	price: z.number().int().nonnegative().max(100_000_000),
	description: z.string().trim().max(2000).default(""),
	ctaLink: z.string().trim().max(300).optional(),
});

export const postMessageBodySchema = z
	.object({
		body: z.string().trim().min(1).max(4000),
		kind: z
			.enum(["text", "attachment", "recommendation", "escalation"])
			.default("text"),
		recommendation: recommendationSchema.optional(),
	})
	.strict();

export const escalateBodySchema = z
	.object({
		reason: z.string().trim().min(1).max(1000),
	})
	.strict();
