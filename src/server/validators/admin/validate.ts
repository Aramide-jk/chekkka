import { z } from "zod";

export const setInspectorStatusBodySchema = z
	.object({
		action: z.enum(["approve", "reject", "suspend", "reactivate"]),
	})
	.strict();
