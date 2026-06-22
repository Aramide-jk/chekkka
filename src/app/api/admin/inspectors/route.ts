import { ok, withApiHandler, withPermission } from "@/server/lib";
import {
	type InspectorStatusFilter,
	listAllInspectors,
	listPendingApplications,
	resolveDocumentLinks,
} from "@/server/services/inspectorProfiles";

export const runtime = "nodejs";

const VALID_FILTERS = new Set<InspectorStatusFilter>([
	"pending",
	"approved",
	"rejected",
	"suspended",
]);

// Inspector documents are stored as S3 keys; resolve them to presigned links so
// the admin client can render them. The link expires with the inspector-data
// window (the pending-applications list is cached for this long).
const INSPECTOR_DOC_LINK_TTL_SECONDS = 60;

// Map each row to a new object with presigned document links — the resolver
// never mutates the source, so the underlying service cache keeps the raw keys.
function resolveInspectorDocuments<T>(rows: T[]): Promise<T[]> {
	return Promise.all(
		rows.map((row) =>
			resolveDocumentLinks(
				row as Parameters<typeof resolveDocumentLinks>[0],
				INSPECTOR_DOC_LINK_TTL_SECONDS,
			),
		),
	) as Promise<T[]>;
}

export const GET = withApiHandler(
	{
		route: "/api/admin/inspectors",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withPermission("inspectors.view", async ({ req }) => {
		const { searchParams } = new URL(req.url);
		const filter = searchParams.get("status");
		const limit = Math.min(200, Number(searchParams.get("limit") ?? 100));
		const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));

		// No `status=` keeps backwards-compat: returns the pending-applications
		// list as before. Any other valid filter returns the full roster for
		// that status. `?status=all` returns every inspector regardless of
		// user.status.
		if (!filter) {
			const applications = await listPendingApplications();
			return ok({
				applications: await resolveInspectorDocuments(applications),
			});
		}
		if (filter === "all") {
			const inspectors = await listAllInspectors({ limit, offset });
			return ok({
				inspectors: await resolveInspectorDocuments(inspectors),
			});
		}
		if (VALID_FILTERS.has(filter as InspectorStatusFilter)) {
			const inspectors = await listAllInspectors({
				status: filter as InspectorStatusFilter,
				limit,
				offset,
			});
			return ok({
				inspectors: await resolveInspectorDocuments(inspectors),
			});
		}
		return ok({ inspectors: [] });
	}),
);
