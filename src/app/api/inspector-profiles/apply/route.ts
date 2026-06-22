import { ErrForbidden, ErrInvalidFields } from "@/server/constants/errors";
import {
	created,
	parseMultipart,
	singleFileBuffer,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { applyAsInspector } from "@/server/services/inspectorProfiles";
import { applyFieldsSchema } from "@/server/validators/inspectorProfiles/validate";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{
		route: "/api/inspector-profiles/apply",
		rateLimit: { windowMs: 60_000, maxRequests: 30 },
	},
	withAuth(async ({ req, auth }) => {
		if (auth.role !== "inspector" && auth.role !== "buyer")
			throw ErrForbidden;

		const parsed = await parseMultipart(req);
		const fieldsParsed = applyFieldsSchema.safeParse(parsed.fields);
		if (!fieldsParsed.success) throw ErrInvalidFields;

		const profile = await applyAsInspector({
			userId: auth.userId,
			yearsExperience: fieldsParsed.data.yearsExperience,
			specialisations: fieldsParsed.data.specialisations
				? fieldsParsed.data.specialisations
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean)
				: [],
			bio: fieldsParsed.data.bio ?? "",
			city: fieldsParsed.data.city,
			documents: {
				idDocument: singleFileBuffer(parsed, "idDocument") ?? undefined,
				certificate:
					singleFileBuffer(parsed, "certificate") ?? undefined,
				extra: singleFileBuffer(parsed, "extra") ?? undefined,
			},
		});

		return created({ profile }, "Application submitted");
	}),
);
