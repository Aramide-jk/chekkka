"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styled from "styled-components";
import useSWR from "swr";
import { Button, Card, Eyebrow, Icon, Pill } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

interface IProps {
	id: string;
	// When rendered from a public /share/[nonce] link, the inspection is
	// resolved server-side and passed in directly (the viewer is not
	// authenticated, so the client can't fetch it).
	sharedInspection?: IInspection;
}

interface IChecklistItem {
	label: string;
	status: "good" | "minor" | "serious" | "n/a";
	comment?: string;
}

interface IReport {
	overview: Record<string, string | number | undefined>;
	exterior: IChecklistItem[];
	interior: IChecklistItem[];
	mechanical: IChecklistItem[];
	roadTest: IChecklistItem[];
	verdict: "good" | "caution" | "danger";
	summary: {
		passed: number;
		minor: number;
		serious: number;
		written: string;
	};
}

interface IInspection {
	_id: string;
	status:
		| "submitted"
		| "assigned"
		| "scheduled"
		| "in_progress"
		| "report_processing"
		| "completed";
	car: { make: string; model: string; year: number };
	createdAt?: string;
	completedAt?: string;
	report?: IReport;
	photoCount: number;
}

const TABS = [
	"Overview",
	"Exterior",
	"Interior",
	"Mechanical",
	"Road Test",
	"Photos",
	"Verdict",
] as const;
const STAGES = [
	{ k: "submitted", label: "Submitted" },
	{ k: "assigned", label: "Assigned" },
	{ k: "scheduled", label: "Scheduled" },
	{ k: "in_progress", label: "In progress" },
	{ k: "report_processing", label: "Report processing" },
	{ k: "completed", label: "Completed" },
] as const;

const Tabs = styled.div`
    display: flex;
    gap: 4px;
    overflow-x: auto;
    border-bottom: 1px solid var(--hairline);
    margin-bottom: 32px;
`;
const Tab = styled.button<{ $on: boolean }>`
    padding: 14px 18px;
    background: transparent;
    color: ${(p) => (p.$on ? "var(--gold-bright)" : "var(--ink-muted)")};
    border: none;
    border-bottom: 2px solid ${(p) => (p.$on ? "var(--gold)" : "transparent")};
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    &:hover { color: var(--ink); }
`;
const Lifecycle = styled(Card)`padding: 24px; margin-bottom: 24px;`;
const StageRow = styled.div`display: flex; align-items: center; gap: 8px; flex-wrap: wrap;`;
const Stage = styled.div<{ $on: boolean; $done: boolean }>`
    padding: 8px 14px;
    border-radius: var(--r-pill);
    background: ${(p) => (p.$on ? "var(--gold-wash)" : p.$done ? "var(--surface-2)" : "transparent")};
    border: 1px solid ${(p) => (p.$on || p.$done ? "var(--gold-wash-2)" : "var(--hairline)")};
    color: ${(p) => (p.$on ? "var(--gold-bright)" : p.$done ? "var(--ink)" : "var(--ink-muted)")};
    font-size: 12px;
`;
const Grid = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const Section = styled(Card)`padding: 28px;`;
const SectionTitle = styled.h2`
    font-family: var(--display);
    font-size: 24px;
    margin: 0 0 18px;
`;
const Spec = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 32px;
    @media (max-width: 540px) { grid-template-columns: 1fr; }
`;
const SpecRow = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--hairline);
    font-size: 13px;
    span:first-child { color: var(--ink-muted); }
    span:last-child { color: var(--ink); }
`;
const Counts = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 16px;
`;
const Count = styled.div<{ $tone: "good" | "caution" | "danger" }>`
    padding: 18px;
    border-radius: var(--r-md);
    background: ${(p) => `var(--${p.$tone}-wash)`};
    border: 1px solid ${(p) => `var(--${p.$tone}-deep)`};
    color: ${(p) => `var(--${p.$tone})`};
`;
const Verdict = styled.div<{ $tone: "good" | "caution" | "danger" }>`
    padding: 32px;
    border-radius: var(--r-md);
    background: ${(p) => `var(--${p.$tone}-wash)`};
    border: 1px solid ${(p) => `var(--${p.$tone}-deep)`};
    text-align: center;
`;
const VerdictTitle = styled.div<{ $tone: "good" | "caution" | "danger" }>`
    font-family: var(--display);
    font-size: 44px;
    color: ${(p) => `var(--${p.$tone})`};
    margin: 8px 0 12px;
`;
const ChecklistGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    @media (max-width: 540px) { grid-template-columns: 1fr; }
`;
const Check = styled.div<{ $status: IChecklistItem["status"] }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-radius: var(--r-sm);
    background: ${(p) =>
		p.$status === "good"
			? "var(--surface-2)"
			: p.$status === "minor"
				? "var(--caution-wash)"
				: p.$status === "serious"
					? "var(--danger-wash)"
					: "var(--surface)"};
    border: 1px solid ${(p) =>
		p.$status === "good"
			? "var(--hairline)"
			: p.$status === "minor"
				? "var(--caution-deep)"
				: p.$status === "serious"
					? "var(--danger-deep)"
					: "var(--hairline)"};
    font-size: 13px;
`;
const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    @media (max-width: 720px) { grid-template-columns: repeat(2, 1fr); }
`;
const PhotoTile = styled.div`
    aspect-ratio: 4 / 3;
    background:
        radial-gradient(120% 90% at 50% 0%, rgba(201,169,97,0.10), transparent 60%),
        var(--surface-2);
    border: 1px solid var(--hairline);
    border-radius: var(--r-sm);
    display: grid;
    place-items: center;
    color: var(--ink-muted);
`;

const SAMPLE_INSPECTION: IInspection = {
	_id: "sample",
	status: "completed",
	car: { make: "Toyota", model: "Camry SE", year: 2018 },
	photoCount: 32,
	completedAt: new Date().toISOString(),
	report: {
		overview: {
			Year: 2018,
			Make: "Toyota",
			Model: "Camry SE",
			VIN: "4T1BF1FK2EU***781",
			Mileage: "76,400 km",
			Transmission: "Automatic",
			Engine: "2.5L I4",
		},
		exterior: [
			{ label: "Body alignment", status: "good" },
			{ label: "Paint condition", status: "minor" },
			{ label: "Scratches", status: "minor" },
			{ label: "Dents", status: "good" },
			{ label: "Rust", status: "good" },
			{ label: "Tyres", status: "minor" },
		],
		interior: [
			{ label: "Dashboard", status: "good" },
			{ label: "Seats", status: "good" },
			{ label: "AC", status: "good" },
		],
		mechanical: [
			{ label: "Engine", status: "good" },
			{ label: "Transmission", status: "good" },
			{ label: "Brakes", status: "good" },
		],
		roadTest: [
			{ label: "Starting", status: "good" },
			{ label: "Steering", status: "good" },
		],
		verdict: "good",
		summary: {
			passed: 42,
			minor: 5,
			serious: 1,
			written:
				"The car is in solid mechanical and structural condition. Minor cosmetic items can be remediated within a small budget.",
		},
	},
};

const VERDICT_COPY: Record<IReport["verdict"], string> = {
	good: "Worth Buying",
	caution: "Buy With Caution",
	danger: "Not Recommended",
};

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(8, 8, 6, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
`;
const Modal = styled(Card)`
    width: 100%;
    max-width: 520px;
    padding: 28px;
    max-height: 90vh;
    overflow-y: auto;
`;
const BrokerCopy = styled.p`
    color: var(--ink-soft);
    font-size: 14px;
    line-height: 1.6;
    margin: 12px 0 20px;
`;
const FieldLabel = styled.label`
    display: block;
    margin-bottom: 14px;
    span {
        display: block;
        color: var(--ink-soft);
        font-size: 12px;
        margin-bottom: 6px;
    }
    input, textarea {
        width: 100%;
        padding: 11px 13px;
        background: var(--surface-2);
        border: 1px solid var(--hairline-strong);
        border-radius: var(--r-sm);
        color: var(--ink);
        font-family: var(--sans);
        font-size: 14px;
    }
`;
const ModalError = styled.div`
    padding: 9px 13px;
    background: var(--danger-wash);
    border: 1px solid var(--danger-deep);
    border-radius: var(--r-sm);
    color: var(--danger);
    font-size: 13px;
    margin-bottom: 14px;
`;

export default function InspectionWrapper({ id, sharedInspection }: IProps) {
	const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
	const isShared = !!sharedInspection;
	const isSample = id === "sample";
	// Synthetic = no client fetch (static sample or a server-resolved share).
	const isSynthetic = isSample || isShared;
	const readOnly = isShared;

	// Share
	const [shareMsg, setShareMsg] = useState<string | null>(null);
	const [shareBusy, setShareBusy] = useState(false);

	async function handleShare() {
		if (shareBusy) return;
		setShareBusy(true);
		try {
			const res = await api().post(`/api/inspections/${id}/share`, {});
			const path = res.data?.data?.path as string | undefined;
			const url =
				typeof window !== "undefined" && path
					? `${window.location.origin}${path}`
					: (path ?? "");
			if (url && navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(url);
				setShareMsg("Share link copied to clipboard");
			} else {
				setShareMsg(url || "Share link created");
			}
		} catch {
			setShareMsg("Could not create share link");
		} finally {
			setShareBusy(false);
			setTimeout(() => setShareMsg(null), 4000);
		}
	}

	function handleDownload() {
		if (typeof window !== "undefined") window.print();
	}

	// Broker request modal
	const [brokerOpen, setBrokerOpen] = useState(false);
	const [brokerDone, setBrokerDone] = useState(false);
	const [brokerBusy, setBrokerBusy] = useState(false);
	const [brokerError, setBrokerError] = useState<string | null>(null);
	const [brokerForm, setBrokerForm] = useState({
		budget: "",
		paymentMethod: "Bank transfer",
		deliveryAddress: "",
		instructions: "",
	});

	async function submitBrokerRequest() {
		if (brokerBusy) return;
		const budget = Number(brokerForm.budget.replace(/[^0-9]/g, ""));
		if (!budget || budget <= 0) {
			setBrokerError("Enter your budget.");
			return;
		}
		if (!brokerForm.deliveryAddress.trim()) {
			setBrokerError("Enter a delivery address.");
			return;
		}
		setBrokerBusy(true);
		setBrokerError(null);
		try {
			await api().post("/api/broker-requests", {
				inspectionId: id,
				budget,
				paymentMethod:
					brokerForm.paymentMethod.trim() || "Bank transfer",
				deliveryAddress: brokerForm.deliveryAddress.trim(),
				instructions: brokerForm.instructions.trim() || undefined,
			});
			setBrokerDone(true);
		} catch (err) {
			setBrokerError(
				getErrorMessage(err, "Could not submit broker request"),
			);
		} finally {
			setBrokerBusy(false);
		}
	}

	const { data } = useSWR<IResponseEnvelope<{ inspection: IInspection }>>(
		isSynthetic ? null : `/api/inspections/${id}`,
		fetcher,
		{ revalidateOnMount: true },
	);

	const inspection: IInspection | undefined = isShared
		? sharedInspection
		: isSample
			? SAMPLE_INSPECTION
			: data?.data?.inspection;

	const stages = useMemo(
		() =>
			STAGES.findIndex(
				(s) => s.k === (inspection?.status ?? "submitted"),
			),
		[inspection?.status],
	);

	const car = inspection?.car
		? `${inspection.car.make} ${inspection.car.model}`
		: "Inspection";
	const year = inspection?.car?.year ?? "";
	const report = inspection?.report;
	const verdict = report?.verdict ?? "good";

	const subtitle = inspection
		? inspection.status === "completed"
			? `Completed ${new Date(inspection.completedAt ?? Date.now()).toLocaleDateString()} · Verdict: ${VERDICT_COPY[verdict]}`
			: `Status: ${inspection.status.replace(/_/g, " ")}`
		: "Loading inspection…";

	return (
		<PageShell
			eyebrow={`Inspection · ${id}`}
			title={car}
			titleEm={String(year)}
			navTitle={`Inspection ${id}`}
			subtitle={subtitle}
			right={
				<div
					style={{
						display: "flex",
						gap: 8,
						alignItems: "center",
					}}
				>
					{shareMsg && (
						<span
							style={{
								fontSize: 12,
								color: "var(--ink-muted)",
							}}
						>
							{shareMsg}
						</span>
					)}
					<Button
						variant="secondary"
						size="sm"
						icon="download"
						onClick={handleDownload}
					>
						Download PDF
					</Button>
					{!isSynthetic && (
						<Button
							variant="secondary"
							size="sm"
							icon="share"
							onClick={handleShare}
							disabled={shareBusy}
						>
							Share
						</Button>
					)}
				</div>
			}
		>
			<Lifecycle>
				<Eyebrow $gold style={{ marginBottom: 12 }}>
					Lifecycle
				</Eyebrow>
				<StageRow>
					{STAGES.map((s, idx) => (
						<Stage
							key={s.k}
							$on={idx === stages}
							$done={idx < stages}
						>
							{s.label}
						</Stage>
					))}
				</StageRow>
				{inspection?.status === "in_progress" && (
					<div style={{ marginTop: 14 }}>
						<Link href={`/inspections/${inspection._id}/live`}>
							<Button
								variant="primary"
								size="sm"
								iconRight="chevron-right"
							>
								Watch live feed
							</Button>
						</Link>
					</div>
				)}
			</Lifecycle>

			<Tabs data-testid="inspection-tabs">
				{TABS.map((t) => (
					<Tab
						key={t}
						$on={tab === t}
						onClick={() => setTab(t)}
						type="button"
					>
						{t}
					</Tab>
				))}
			</Tabs>

			<Grid>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 24,
					}}
				>
					{tab === "Overview" && (
						<Section>
							<SectionTitle>Vehicle</SectionTitle>
							{report?.overview ? (
								<Spec>
									{Object.entries(report.overview).map(
										([k, v]) =>
											v == null || v === "" ? null : (
												<SpecRow key={k}>
													<span>{k}</span>
													<span>{String(v)}</span>
												</SpecRow>
											),
									)}
								</Spec>
							) : (
								<p
									style={{
										color: "var(--ink-muted)",
										fontSize: 13,
									}}
								>
									Vehicle details will appear once the report
									is filed.
								</p>
							)}
							{report?.summary && (
								<Counts>
									<Count $tone="good">
										<Eyebrow
											style={{ color: "var(--good)" }}
										>
											Passed
										</Eyebrow>
										<div
											style={{
												fontFamily: "var(--display)",
												fontSize: 36,
												marginTop: 6,
											}}
										>
											{report.summary.passed}
										</div>
									</Count>
									<Count $tone="caution">
										<Eyebrow
											style={{ color: "var(--caution)" }}
										>
											Minor
										</Eyebrow>
										<div
											style={{
												fontFamily: "var(--display)",
												fontSize: 36,
												marginTop: 6,
											}}
										>
											{report.summary.minor}
										</div>
									</Count>
									<Count $tone="danger">
										<Eyebrow
											style={{ color: "var(--danger)" }}
										>
											Serious
										</Eyebrow>
										<div
											style={{
												fontFamily: "var(--display)",
												fontSize: 36,
												marginTop: 6,
											}}
										>
											{report.summary.serious}
										</div>
									</Count>
								</Counts>
							)}
						</Section>
					)}

					{tab !== "Overview" &&
						tab !== "Photos" &&
						tab !== "Verdict" && (
							<Section>
								<SectionTitle>{tab}</SectionTitle>
								<ChecklistGrid>
									{(
										((
											report as
												| Record<string, unknown>
												| undefined
										)?.[
											tab === "Road Test"
												? "roadTest"
												: tab.toLowerCase()
										] as IChecklistItem[] | undefined) ?? []
									).map((c) => (
										<Check key={c.label} $status={c.status}>
											<span>{c.label}</span>
											<Pill
												tone={
													c.status === "good"
														? "good"
														: c.status === "minor"
															? "caution"
															: c.status ===
																	"serious"
																? "danger"
																: "ghost"
												}
											>
												{c.status}
											</Pill>
										</Check>
									))}
								</ChecklistGrid>
							</Section>
						)}

					{tab === "Photos" && (
						<Section>
							<SectionTitle>Photos</SectionTitle>
							<PhotoGrid>
								{Array.from({
									length: Math.max(
										inspection?.photoCount ?? 0,
										0,
									),
								}).map((_, i) => (
									<PhotoTile key={i}>
										<Icon name="camera" size={20} />
									</PhotoTile>
								))}
							</PhotoGrid>
						</Section>
					)}

					{tab === "Verdict" && (
						<Verdict $tone={verdict}>
							<Eyebrow style={{ color: `var(--${verdict})` }}>
								Verdict
							</Eyebrow>
							<VerdictTitle $tone={verdict}>
								{VERDICT_COPY[verdict]}
							</VerdictTitle>
							<p
								style={{
									color: "var(--ink-soft)",
									fontSize: 14,
									maxWidth: 540,
									margin: "0 auto",
									lineHeight: 1.6,
								}}
							>
								{report?.summary?.written ??
									"This report has not yet been filed by the inspector."}
							</p>
						</Verdict>
					)}
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 24,
					}}
				>
					<Section>
						<Eyebrow $gold style={{ marginBottom: 12 }}>
							Inspector
						</Eyebrow>
						<div style={{ fontSize: 16, marginBottom: 6 }}>
							Assigned inspector
						</div>
						<div
							style={{ color: "var(--ink-muted)", fontSize: 12 }}
						>
							Performance metrics appear after the report locks.
						</div>
					</Section>

					{!readOnly && (
						<Section>
							<Eyebrow $gold style={{ marginBottom: 12 }}>
								Next steps
							</Eyebrow>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: 10,
								}}
							>
								<Link href="/book">
									<Button
										variant="secondary"
										size="sm"
										fullWidth
										icon="plus"
									>
										Book another
									</Button>
								</Link>
								<Button
									variant="primary"
									size="sm"
									fullWidth
									icon="briefcase"
									onClick={() => {
										setBrokerDone(false);
										setBrokerError(null);
										setBrokerOpen(true);
									}}
								>
									Talk to a broker
								</Button>
							</div>
						</Section>
					)}
				</div>
			</Grid>

			{brokerOpen && (
				<Overlay
					onClick={(e) => {
						if (e.target === e.currentTarget) setBrokerOpen(false);
					}}
				>
					<Modal>
						<Eyebrow $gold style={{ marginBottom: 4 }}>
							Chekka Broker Service
						</Eyebrow>
						{brokerDone ? (
							<>
								<BrokerCopy>
									Your broker request is in. A Chekka broker
									will be assigned shortly and will reach out
									in your chat to negotiate the price,
									coordinate payment, and arrange delivery.
								</BrokerCopy>
								<div style={{ display: "flex", gap: 10 }}>
									<Link href="/chat" style={{ flex: 1 }}>
										<Button
											variant="primary"
											size="md"
											fullWidth
										>
											Open chat
										</Button>
									</Link>
									<Button
										variant="secondary"
										size="md"
										onClick={() => setBrokerOpen(false)}
									>
										Close
									</Button>
								</div>
							</>
						) : (
							<>
								<BrokerCopy>
									You've seen the report. Now let a Chekka
									broker take it from here — negotiate the
									price with the seller, coordinate your
									payment securely, and arrange delivery of
									the car straight to your door. You don't
									have to meet the seller, travel to the car,
									or handle a single kobo directly. A small
									brokerage fee applies.
								</BrokerCopy>
								<FieldLabel>
									<span>Your budget (₦)</span>
									<input
										inputMode="numeric"
										value={brokerForm.budget}
										onChange={(e) =>
											setBrokerForm((f) => ({
												...f,
												budget: e.target.value,
											}))
										}
										placeholder="e.g. 8,500,000"
									/>
								</FieldLabel>
								<FieldLabel>
									<span>Preferred payment method</span>
									<input
										value={brokerForm.paymentMethod}
										onChange={(e) =>
											setBrokerForm((f) => ({
												...f,
												paymentMethod: e.target.value,
											}))
										}
										placeholder="Bank transfer"
									/>
								</FieldLabel>
								<FieldLabel>
									<span>Delivery address</span>
									<input
										value={brokerForm.deliveryAddress}
										onChange={(e) =>
											setBrokerForm((f) => ({
												...f,
												deliveryAddress: e.target.value,
											}))
										}
										placeholder="Where should we deliver the car?"
									/>
								</FieldLabel>
								<FieldLabel>
									<span>Special instructions (optional)</span>
									<textarea
										rows={3}
										value={brokerForm.instructions}
										onChange={(e) =>
											setBrokerForm((f) => ({
												...f,
												instructions: e.target.value,
											}))
										}
										placeholder="Anything the broker should know…"
									/>
								</FieldLabel>
								{brokerError && (
									<ModalError>{brokerError}</ModalError>
								)}
								<div style={{ display: "flex", gap: 10 }}>
									<Button
										variant="primary"
										size="md"
										fullWidth
										disabled={brokerBusy}
										onClick={submitBrokerRequest}
									>
										{brokerBusy
											? "Submitting…"
											: "Connect me with a broker"}
									</Button>
									<Button
										variant="secondary"
										size="md"
										onClick={() => setBrokerOpen(false)}
									>
										No thanks
									</Button>
								</div>
							</>
						)}
					</Modal>
				</Overlay>
			)}
		</PageShell>
	);
}
