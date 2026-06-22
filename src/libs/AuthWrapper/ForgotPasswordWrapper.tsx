"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components";
import { api, getErrorMessage } from "@/constants";
import AuthShell from "./AuthShell";
import Field from "./Field";

export default function ForgotPasswordWrapper() {
	const [identifier, setIdentifier] = useState("");
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (busy || sent) return;
		setError(null);
		setBusy(true);
		try {
			await api().post("/api/auth/forgot-password", { identifier });
			setSent(true);
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setBusy(false);
		}
	}

	return (
		<AuthShell
			eyebrow="Recover access"
			title="Forgot your"
			titleEm="password?"
			subtitle="Enter the email or phone tied to your account. We'll send a 6-digit code valid for 10 minutes."
			footer={
				<>
					Remembered it? <Link href="/login">Back to sign in</Link>
				</>
			}
		>
			<form onSubmit={handleSubmit} data-testid="forgot-password-form">
				{error && (
					<div
						role="alert"
						style={{
							marginBottom: 18,
							padding: "10px 14px",
							background: "var(--danger-wash)",
							border: "1px solid var(--danger-deep)",
							borderRadius: "var(--r-sm)",
							color: "var(--danger)",
							fontSize: 13,
						}}
					>
						{error}
					</div>
				)}
				<Field
					label="Email or phone"
					name="identifier"
					placeholder="you@example.com or +2348012345678"
					value={identifier}
					onChange={(e) => setIdentifier(e.target.value)}
					required
				/>
				<Button
					type="submit"
					variant="primary"
					size="lg"
					fullWidth
					disabled={sent || busy}
				>
					{sent
						? "Code sent — check your inbox"
						: busy
							? "Sending…"
							: "Send reset code"}
				</Button>
			</form>
		</AuthShell>
	);
}
