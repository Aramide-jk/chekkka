import { type JWTPayload, jwtVerify, SignJWT } from "jose";
import { type NextRequest, NextResponse } from "next/server";

type UserRole = "buyer" | "inspector" | "consultant" | "manager" | "admin";
type UserStatus = "active" | "pending" | "approved" | "rejected" | "suspended";

interface TokenPayload extends JWTPayload {
	userId: string;
	role: UserRole;
	status: UserStatus;
}

// Mirrors src/server/lib/cookies.ts — kept in sync intentionally so this
// proxy module can stay free of server-only imports.
const ACCESS_COOKIE = "chekka_access";
const REFRESH_COOKIE = "chekka_refresh";
const ACCESS_TTL_SECONDS = 60 * 60 * 24;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

const accessSecret = new TextEncoder().encode(
	process.env.JWT_ACCESS_TOKEN_SECRET || "dev-access-secret-do-not-use",
);
const refreshSecret = new TextEncoder().encode(
	process.env.JWT_REFRESH_TOKEN_SECRET || "dev-refresh-secret-do-not-use",
);

const ROLE_HOME: Record<UserRole, string> = {
	buyer: "/dashboard",
	inspector: "/inspector/dashboard",
	consultant: "/consultant/chats",
	manager: "/admin",
	admin: "/admin",
};

const INSPECTOR_STATUS_HOME: Record<UserStatus, string> = {
	active: "/inspector/dashboard",
	approved: "/inspector/dashboard",
	pending: "/inspector/pending",
	rejected: "/inspector/rejected",
	suspended: "/inspector/suspended",
};

const PUBLIC_PATHS = new Set<string>([
	"/",
	"/terms",
	"/privacy",
	"/sample-report",
	"/inspector",
]);

const PUBLIC_PREFIXES = ["/share/", "/invite/"];

const GUEST_ONLY_PATHS = new Set<string>([
	"/login",
	"/signup",
	"/forgot-password",
]);

type RouteRule =
	| { kind: "public" }
	| { kind: "guest" }
	| { kind: "auth" }
	| {
			kind: "role";
			roles: UserRole[];
			inspectorStatus?: UserStatus | "any";
	  };

function classifyRoute(pathname: string): RouteRule {
	if (PUBLIC_PATHS.has(pathname)) return { kind: "public" };
	if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
		return { kind: "public" };
	}
	if (GUEST_ONLY_PATHS.has(pathname)) return { kind: "guest" };

	if (pathname === "/onboarding") return { kind: "auth" };

	if (pathname === "/admin" || pathname.startsWith("/admin/")) {
		// Managers can reach the /admin shell; per-section access is enforced
		// at the API + UI layer based on their explicit permissions array.
		// The dedicated /admin/managers admin-tools page is admin-only.
		if (
			pathname === "/admin/managers" ||
			pathname.startsWith("/admin/managers/")
		) {
			return { kind: "role", roles: ["admin"] };
		}
		// The inspection management surface (reassign / cancel) is admin-only;
		// the read-only live monitor (/admin/inspections/live) stays open to
		// managers with live.view.
		if (pathname === "/admin/inspections") {
			return { kind: "role", roles: ["admin"] };
		}
		return { kind: "role", roles: ["admin", "manager"] };
	}

	if (pathname.startsWith("/inspector/")) {
		if (pathname === "/inspector/apply") {
			return {
				kind: "role",
				roles: ["inspector"],
				inspectorStatus: "any",
			};
		}
		if (pathname === "/inspector/pending") {
			return {
				kind: "role",
				roles: ["inspector"],
				inspectorStatus: "pending",
			};
		}
		if (pathname === "/inspector/rejected") {
			return {
				kind: "role",
				roles: ["inspector"],
				inspectorStatus: "rejected",
			};
		}
		if (pathname === "/inspector/suspended") {
			return {
				kind: "role",
				roles: ["inspector"],
				inspectorStatus: "suspended",
			};
		}
		return {
			kind: "role",
			roles: ["inspector"],
			inspectorStatus: "approved",
		};
	}

	if (pathname === "/consultant" || pathname.startsWith("/consultant/")) {
		return { kind: "role", roles: ["consultant", "admin"] };
	}

	if (
		pathname === "/dashboard" ||
		pathname === "/book" ||
		pathname.startsWith("/book/") ||
		pathname === "/chat" ||
		pathname.startsWith("/chat/") ||
		pathname.startsWith("/inspections/")
	) {
		return { kind: "role", roles: ["buyer", "admin", "inspector"] };
	}

	return { kind: "auth" };
}

async function verify(
	token: string | undefined,
	secret: Uint8Array,
): Promise<TokenPayload | null> {
	if (!token) return null;
	try {
		const { payload } = await jwtVerify<TokenPayload>(token, secret);
		if (!payload.userId || !payload.role) return null;
		return payload;
	} catch {
		return null;
	}
}

async function mint(payload: {
	userId: string;
	role: UserRole;
	status: UserStatus;
}) {
	const access = await new SignJWT(payload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
		.sign(accessSecret);
	const refresh = await new SignJWT(payload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(`${REFRESH_TTL_SECONDS}s`)
		.sign(refreshSecret);
	return { accessToken: access, refreshToken: refresh };
}

function cookieOpts() {
	const isProd = process.env.NODE_ENV === "production";
	const domain = process.env.COOKIE_DOMAIN || undefined;
	return {
		httpOnly: true,
		secure: isProd,
		sameSite: "lax" as const,
		path: "/",
		domain,
	};
}

function setAuthCookies(
	res: NextResponse,
	tokens: { accessToken: string; refreshToken: string },
): NextResponse {
	const opts = cookieOpts();
	res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
		...opts,
		maxAge: ACCESS_TTL_SECONDS,
	});
	res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
		...opts,
		maxAge: REFRESH_TTL_SECONDS,
	});
	return res;
}

function clearAuthCookies(res: NextResponse): NextResponse {
	const opts = { ...cookieOpts(), maxAge: 0 };
	res.cookies.set(ACCESS_COOKIE, "", opts);
	res.cookies.set(REFRESH_COOKIE, "", opts);
	return res;
}

function loginRedirect(req: NextRequest, reason?: string): NextResponse {
	const url = req.nextUrl.clone();
	url.pathname = "/login";
	url.search = "";
	const next = req.nextUrl.pathname + req.nextUrl.search;
	if (next && next !== "/login") url.searchParams.set("next", next);
	if (reason) url.searchParams.set("reason", reason);
	return NextResponse.redirect(url);
}

function roleHomeRedirect(
	req: NextRequest,
	role: UserRole,
	status: UserStatus,
): NextResponse {
	const url = req.nextUrl.clone();
	url.search = "";
	if (role === "inspector") {
		url.pathname = INSPECTOR_STATUS_HOME[status] ?? "/inspector/dashboard";
	} else {
		url.pathname = ROLE_HOME[role];
	}
	return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
	const { pathname } = req.nextUrl;
	const rule = classifyRoute(pathname);

	const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
	const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

	let payload = await verify(accessToken, accessSecret);
	let rotated: { accessToken: string; refreshToken: string } | null = null;

	if (!payload && refreshToken) {
		const refreshPayload = await verify(refreshToken, refreshSecret);
		if (refreshPayload) {
			rotated = await mint({
				userId: refreshPayload.userId,
				role: refreshPayload.role,
				status: refreshPayload.status,
			});
			payload = refreshPayload;
		}
	}

	const finish = (res: NextResponse): NextResponse => {
		if (rotated) setAuthCookies(res, rotated);
		return res;
	};

	// PUBLIC — anyone can access; still rotate tokens if applicable.
	if (rule.kind === "public") {
		return finish(NextResponse.next());
	}

	// GUEST-ONLY — redirect signed-in users to their role home.
	if (rule.kind === "guest") {
		if (payload) {
			return finish(roleHomeRedirect(req, payload.role, payload.status));
		}
		return finish(NextResponse.next());
	}

	// Everything below requires a signed-in user.
	if (!payload) {
		// Wipe any stale cookies (e.g. expired refresh) so the client doesn't
		// keep retrying with garbage credentials.
		const res = loginRedirect(req, "auth_required");
		if (accessToken || refreshToken) clearAuthCookies(res);
		return res;
	}

	if (rule.kind === "auth") {
		return finish(NextResponse.next());
	}

	// kind === "role"
	if (!rule.roles.includes(payload.role)) {
		return finish(roleHomeRedirect(req, payload.role, payload.status));
	}

	if (
		payload.role === "inspector" &&
		rule.inspectorStatus &&
		rule.inspectorStatus !== "any"
	) {
		const allowed = rule.inspectorStatus;
		const actual = payload.status;
		// "approved" gate accepts both "approved" and the legacy "active" value.
		const matches =
			allowed === "approved"
				? actual === "approved" || actual === "active"
				: actual === allowed;
		if (!matches) {
			return finish(roleHomeRedirect(req, payload.role, payload.status));
		}
	}

	return finish(NextResponse.next());
}

export const config = {
	matcher: [
		// Run on every page route. Skip API routes (they self-protect via
		// withAuth/withRole), Next internals, and static assets.
		"/((?!api/|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff|woff2|ttf|otf|txt)$).*)",
	],
};
