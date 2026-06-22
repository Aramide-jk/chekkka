import {
	ErrForbidden,
	ErrInvalidAction,
	ErrInvalidFields,
} from "@/server/constants/errors";
import { created, ok, withApiHandler, withAuth } from "@/server/lib";
import {
	createBrokerRequest,
	listForBuyer,
} from "@/server/services/brokerRequests";
import { createBrokerRequestBodySchema } from "@/server/validators/brokerRequests/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/broker-requests",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth(async ({ auth }) => {
		if (auth.role !== "buyer") throw ErrForbidden;
		const requests = await listForBuyer({ buyerId: auth.userId });
		return ok({ requests });
	}),
);

export const POST = withApiHandler(
	{
		route: "/api/broker-requests",
		rateLimit: { windowMs: 60_000, maxRequests: 20 },
	},
	withAuth(async ({ req, auth }) => {
		if (auth.role !== "buyer") throw ErrForbidden;
		const body = await req.json().catch(() => null);
		const parsed = createBrokerRequestBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const request = await createBrokerRequest({
			payload: { ...parsed.data, buyerId: auth.userId },
		});
		if (!request) throw ErrInvalidAction;

		return created({ request }, "Broker request submitted");
	}),
);
