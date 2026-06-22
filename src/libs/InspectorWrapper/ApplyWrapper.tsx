"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";
import { Button, Card, Icon } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { PageShell } from "@/layouts";

const STEPS = ["Personal", "Professional", "Documents"] as const;

const Stepper = styled.div`display: flex; gap: 10px; margin-bottom: 32px;`;
const StepPill = styled.div<{ $on: boolean; $done: boolean }>`
    padding: 8px 14px;
    border-radius: var(--r-pill);
    background: ${(p) => (p.$on ? "var(--gold-wash)" : p.$done ? "var(--surface-2)" : "transparent")};
    border: 1px solid ${(p) => (p.$on || p.$done ? "var(--gold-wash-2)" : "var(--hairline)")};
    color: ${(p) => (p.$on ? "var(--gold-bright)" : p.$done ? "var(--ink)" : "var(--ink-muted)")};
    font-size: 13px;
`;
const Panel = styled(Card)`padding: 32px; max-width: 720px;`;
const PanelTitle = styled.h2`font-family: var(--display); font-size: 26px; margin: 0 0 6px;`;
const Lede = styled.p`color: var(--ink-soft); font-size: 14px; margin-bottom: 24px;`;
const FormGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    @media (max-width: 540px) { grid-template-columns: 1fr; }
`;
const Label = styled.label`
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: var(--ink-soft);
    input, select, textarea {
        padding: 12px 14px;
        background: var(--surface-2);
        border: 1px solid var(--hairline-strong);
        border-radius: var(--r-sm);
        color: var(--ink);
        font-family: var(--sans);
        font-size: 14px;
    }
`;
const Drop = styled.label`
    display: block;
    padding: 28px;
    text-align: center;
    border-radius: var(--r-md);
    border: 1px dashed var(--hairline-strong);
    color: var(--ink-muted);
    background: var(--surface-2);
    cursor: pointer;
    input { display: none; }
`;
const Actions = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 24px;
    gap: 12px;
`;
const ErrorBox = styled.div`
    margin-top: 14px;
    padding: 10px 14px;
    background: var(--danger-wash);
    border: 1px solid var(--danger-deep);
    border-radius: var(--r-sm);
    color: var(--danger);
    font-size: 13px;
`;

export default function ApplyWrapper() {
	const router = useRouter();
	const [step, setStep] = useState(0);
	const [city, setCity] = useState("Lagos");
	const [years, setYears] = useState(0);
	const [specialisations, setSpecialisations] = useState("");
	const [bio, setBio] = useState("");
	const [idDoc, setIdDoc] = useState<File | null>(null);
	const [cert, setCert] = useState<File | null>(null);
	const [extra, setExtra] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isLast = step === STEPS.length - 1;

	async function submit() {
		if (busy) return;
		setBusy(true);
		setError(null);
		try {
			const fd = new FormData();
			fd.set("yearsExperience", String(years));
			fd.set("specialisations", specialisations);
			fd.set("bio", bio);
			fd.set("city", city);
			if (idDoc) fd.set("idDocument", idDoc);
			if (cert) fd.set("certificate", cert);
			if (extra) fd.set("extra", extra);
			// Don't set Content-Type — the browser must inject the multipart
			// boundary. Forcing `multipart/form-data` without it makes the
			// server's formData parse drop every file.
			await api().post("/api/inspector-profiles/apply", fd);
			router.push("/inspector/pending");
			router.refresh();
		} catch (err) {
			setError(getErrorMessage(err, "Application failed"));
			setBusy(false);
		}
	}

	return (
		<PageShell
			eyebrow="Inspector application"
			title="Join the"
			titleEm="Chekka network"
			navTitle="Apply"
			subtitle="Three steps. Admin review usually completes within 48 hours."
			showAccount={false}
		>
			<Stepper data-testid="apply-stepper">
				{STEPS.map((s, idx) => (
					<StepPill key={s} $on={idx === step} $done={idx < step}>
						{idx + 1}. {s}
					</StepPill>
				))}
			</Stepper>

			<Panel data-testid={`apply-step-${step}`}>
				{step === 0 && (
					<>
						<PanelTitle>Personal details</PanelTitle>
						<Lede>
							The basics — who you are and where you work.
						</Lede>
						<FormGrid>
							<Label style={{ gridColumn: "1 / -1" }}>
								City of operation
								<select
									value={city}
									onChange={(e) => setCity(e.target.value)}
								>
									{[
										"Lagos",
										"Abuja",
										"Port Harcourt",
										"Kano",
										"Ibadan",
									].map((c) => (
										<option key={c} value={c}>
											{c}
										</option>
									))}
								</select>
							</Label>
						</FormGrid>
					</>
				)}

				{step === 1 && (
					<>
						<PanelTitle>Professional background</PanelTitle>
						<Lede>
							Tell us about your experience and what you
							specialise in.
						</Lede>
						<FormGrid>
							<Label>
								Years of experience
								<input
									type="number"
									value={years}
									onChange={(e) =>
										setYears(Number(e.target.value) || 0)
									}
									min={0}
								/>
							</Label>
							<Label style={{ gridColumn: "1 / -1" }}>
								Specialisations (comma-separated)
								<input
									value={specialisations}
									onChange={(e) =>
										setSpecialisations(e.target.value)
									}
									placeholder="Sedans, SUVs, hybrids"
								/>
							</Label>
							<Label style={{ gridColumn: "1 / -1" }}>
								Short bio
								<textarea
									rows={3}
									value={bio}
									onChange={(e) => setBio(e.target.value)}
									placeholder="A line or two about your background…"
								/>
							</Label>
						</FormGrid>
					</>
				)}

				{step === 2 && (
					<>
						<PanelTitle>Documents</PanelTitle>
						<Lede>
							Upload your government ID and automotive
							certificate. Stored securely.
						</Lede>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 12,
							}}
						>
							<Drop>
								<Icon name="paperclip" size={18} />
								<div style={{ marginTop: 8, fontSize: 13 }}>
									Government ID —{" "}
									{idDoc?.name ??
										"drop a file or click to upload"}
								</div>
								<input
									type="file"
									accept="image/*,application/pdf"
									onChange={(e) =>
										setIdDoc(e.target.files?.[0] ?? null)
									}
								/>
							</Drop>
							<Drop>
								<Icon name="paperclip" size={18} />
								<div style={{ marginTop: 8, fontSize: 13 }}>
									Automotive certificate —{" "}
									{cert?.name ?? "click to upload"}
								</div>
								<input
									type="file"
									accept="image/*,application/pdf"
									onChange={(e) =>
										setCert(e.target.files?.[0] ?? null)
									}
								/>
							</Drop>
							<Drop>
								<Icon name="paperclip" size={18} />
								<div style={{ marginTop: 8, fontSize: 13 }}>
									Optional extra document —{" "}
									{extra?.name ?? "click to upload"}
								</div>
								<input
									type="file"
									accept="image/*,application/pdf"
									onChange={(e) =>
										setExtra(e.target.files?.[0] ?? null)
									}
								/>
							</Drop>
						</div>
						{error && <ErrorBox>{error}</ErrorBox>}
					</>
				)}

				<Actions>
					<Button
						variant="ghost"
						size="md"
						onClick={() => setStep(Math.max(0, step - 1))}
						disabled={step === 0}
						icon="chevron-left"
					>
						Back
					</Button>
					{isLast ? (
						<Button
							variant="primary"
							size="md"
							iconRight="check"
							onClick={submit}
							disabled={busy}
						>
							{busy ? "Submitting…" : "Submit application"}
						</Button>
					) : (
						<Button
							variant="primary"
							size="md"
							iconRight="chevron-right"
							onClick={() =>
								setStep(Math.min(STEPS.length - 1, step + 1))
							}
						>
							Continue
						</Button>
					)}
				</Actions>
			</Panel>
		</PageShell>
	);
}
