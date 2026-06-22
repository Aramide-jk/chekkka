"use client";

import Link from "next/link";
import { type FormEvent, useContext, useState } from "react";
import styled from "styled-components";
import { Button } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { AppContextProvider } from "@/hooks";
import AuthShell from "./AuthShell";
import Field from "./Field";

const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: -8px 0 24px;
    font-size: 12px;
    color: var(--ink-muted);

    a { color: var(--gold-bright); }
    a:hover { text-decoration: underline; }
`;

const Divider = styled.div`
    text-align: center;
    margin: 28px 0;
    color: var(--ink-faint);
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    position: relative;

    &::before, &::after {
        content: "";
        position: absolute;
        top: 50%;
        width: 40%;
        height: 1px;
        background: var(--hairline);
    }
    &::before { left: 0; }
    &::after  { right: 0; }
`;

const ErrorBox = styled.div`
    margin: -4px 0 18px;
    padding: 10px 14px;
    background: var(--danger-wash);
    border: 1px solid var(--danger-deep);
    border-radius: var(--r-sm);
    color: var(--danger);
    font-size: 13px;
`;

const POST_LOGIN_PATH_BY_ROLE: Record<string, string> = {
	buyer: "/dashboard",
	inspector: "/inspector/dashboard",
	consultant: "/consultant/chats",
	admin: "/admin",
};

export default function LoginWrapper() {
	const { setUser } = useContext(AppContextProvider);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (busy) return;
		setError(null);
		setBusy(true);
		try {
			const res = await api().post("/api/auth/login", {
				email,
				password,
			});
			const user = res.data?.data?.user;
			if (user) setUser(user);
			const roleHome =
				POST_LOGIN_PATH_BY_ROLE[user?.role as string] ?? "/dashboard";
			const next = new URLSearchParams(window.location.search).get(
				"next",
			);
			// Only allow same-origin paths through `next` to avoid open redirects.
			const safeNext =
				next?.startsWith("/") && !next.startsWith("//") ? next : null;
			window.location.assign(safeNext ?? roleHome);
		} catch (err) {
			setError(getErrorMessage(err));
			setBusy(false);
		}
	}

	return (
		<AuthShell
			eyebrow="Welcome back"
			title="Sign in to"
			titleEm="Chekka"
			subtitle="Pick up where you left off — your inspections, reports, and chats are waiting."
			footer={
				<>
					New to Chekka? <Link href="/signup">Create an account</Link>
				</>
			}
		>
			<form onSubmit={handleSubmit} data-testid="login-form">
				{error && <ErrorBox role="alert">{error}</ErrorBox>}
				<Field
					label="Email"
					name="email"
					type="email"
					placeholder="you@example.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					autoComplete="email"
					required
				/>
				<Field
					label="Password"
					name="password"
					type="password"
					placeholder="••••••••"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					autoComplete="current-password"
					required
				/>
				<Row>
					<span></span>
					<Link href="/forgot-password">Forgot your password?</Link>
				</Row>
				<Button
					type="submit"
					variant="primary"
					size="lg"
					fullWidth
					disabled={busy}
				>
					{busy ? "Signing in…" : "Sign in"}
				</Button>
				<Divider>or</Divider>
				<Button
					type="button"
					variant="secondary"
					size="lg"
					fullWidth
					icon="user"
					disabled
				>
					Continue with Google
				</Button>
			</form>
		</AuthShell>
	);
}
