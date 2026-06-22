"use client";

import Link from "next/link";
import { type FormEvent, useContext, useState } from "react";
import styled from "styled-components";
import { Button } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { AppContextProvider } from "@/hooks";
import AuthShell from "./AuthShell";
import Field from "./Field";

const Grid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 16px;

    @media (max-width: 540px) {
        grid-template-columns: 1fr;
    }
`;

const Agree = styled.p`
    font-size: 12px;
    color: var(--ink-muted);
    margin: 12px 0 24px;
    line-height: 1.6;

    a { color: var(--gold-bright); }
    a:hover { text-decoration: underline; }
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

export default function SignupWrapper() {
	const { setUser } = useContext(AppContextProvider);
	const [fullName, setFullName] = useState("");
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (busy) return;
		setError(null);
		setBusy(true);
		try {
			const res = await api().post("/api/auth/signup", {
				fullName,
				username,
				email,
				phone,
				password,
			});
			const user = res.data?.data?.user;
			if (user) setUser(user);
			window.location.assign("/onboarding");
		} catch (err) {
			setError(getErrorMessage(err));
			setBusy(false);
		}
	}

	return (
		<AuthShell
			eyebrow="Create your account"
			title="Start with"
			titleEm="Chekka"
			subtitle="A few details and you can book your first certified inspection in minutes."
			footer={
				<>
					Already have an account? <Link href="/login">Sign in</Link>
				</>
			}
		>
			<form onSubmit={handleSubmit} data-testid="signup-form">
				{error && <ErrorBox role="alert">{error}</ErrorBox>}
				<Grid>
					<Field
						label="Full name"
						name="fullName"
						placeholder="Ada Lovelace"
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
						autoComplete="name"
						required
					/>
					<Field
						label="Username"
						name="username"
						placeholder="ada"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						autoComplete="username"
						required
					/>
				</Grid>
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
					label="Phone"
					name="phone"
					type="tel"
					placeholder="+2348012345678"
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
					autoComplete="tel"
					required
				/>
				<Field
					label="Password"
					name="password"
					type="password"
					placeholder="At least 8 characters"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					autoComplete="new-password"
					required
					minLength={8}
				/>
				<Agree>
					By creating an account you agree to our{" "}
					<Link href="/terms">Terms</Link> and{" "}
					<Link href="/privacy">Privacy Policy</Link>.
				</Agree>
				<Button
					type="submit"
					variant="primary"
					size="lg"
					fullWidth
					disabled={busy}
				>
					{busy ? "Creating…" : "Create account"}
				</Button>
			</form>
		</AuthShell>
	);
}
