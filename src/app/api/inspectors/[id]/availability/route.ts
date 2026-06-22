import type { NextRequest } from "next/server";
import { ErrInvalidFields } from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import { getBookedSlots } from "@/server/services/inspections";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const FIXED_SLOTS = ["09:00", "11:00", "14:00", "16:00"];

// Returns, for a given inspector and date, which of the fixed slots are
// already taken — so the booking calendar (Step 4) can grey them out and
// prevent double-booking.
export const GET = withApiHandler<Ctx>(
	{
		route: "/api/inspectors/:id/availability",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth<Ctx>(async ({ req, context }) => {
		const { id } = await context.params;
		const url = new URL((req as NextRequest).url);
		const date = url.searchParams.get("date");
		if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw ErrInvalidFields;

		const from = new Date(`${date}T00:00:00.000Z`);
		const to = new Date(`${date}T23:59:59.999Z`);
		if (Number.isNaN(from.getTime())) throw ErrInvalidFields;

		const booked = await getBookedSlots({ inspectorId: id, from, to });
		const taken = Array.from(
			new Set(booked.map((b) => b.slot).filter(Boolean)),
		);

		return ok({
			date,
			slots: FIXED_SLOTS,
			taken,
			available: FIXED_SLOTS.filter((s) => !taken.includes(s)),
		});
	}),
);
