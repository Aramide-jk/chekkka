import "server-only";
import {
	type IInspection,
	listOverdueInspectionsDB,
} from "@/server/models/inspections";

/**
 * Intentionally uncached: this is consumed by background sweepers that need
 * a live view of the queue, not a stale snapshot.
 */
export default async function listOverdue({
	now,
}: {
	now?: Date;
} = {}): Promise<IInspection[]> {
	return listOverdueInspectionsDB(now ?? new Date());
}
