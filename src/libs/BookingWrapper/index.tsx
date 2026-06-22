"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import useSWR from "swr";
import { Button, Card, Icon, Pill, Stars } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

const STEPS = [
	{ k: "1", label: "Car details" },
	{ k: "2", label: "Inspection type" },
	{ k: "3", label: "Inspector" },
	{ k: "4", label: "Schedule" },
	{ k: "5", label: "Payment" },
] as const;

const NEXT_STEP: Record<string, string> = {
	"1": "2",
	"2": "3",
	"3": "4",
	"4": "5",
};

const PRICE_BY_TYPE = { standard: 32_000, premium: 52_000, special_request: 0 };
const PLATFORM_FEE = 2_500;

type InspectionType = "standard" | "premium" | "special_request";
type SellerType = "dealership" | "private";

interface IDraft {
	car: {
		make: string;
		model: string;
		year: number;
		color?: string;
		sellerType: SellerType;
		city: string;
		address: string;
		sellerContact?: string;
		notes?: string;
	};
	inspectionType: InspectionType;
	assignedInspectorId?: string;
	scheduledFor?: string;
	slot?: string;
}

const DRAFT_KEY = "chekka:booking:draft:v1";

function defaultDraft(): IDraft {
	return {
		car: {
			make: "Toyota",
			model: "Camry",
			year: 2020,
			sellerType: "dealership",
			city: "Lagos",
			address: "",
		},
		inspectionType: "premium",
	};
}

function readDraft(): IDraft {
	if (typeof window === "undefined") return defaultDraft();
	try {
		const raw = window.localStorage.getItem(DRAFT_KEY);
		if (!raw) return defaultDraft();
		return { ...defaultDraft(), ...JSON.parse(raw) };
	} catch {
		return defaultDraft();
	}
}

function writeDraft(d: IDraft) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
	} catch {
		// ignore
	}
}

interface IProps {
	step: string;
}

interface IInspectorListItem {
	_id: string;
	userId?: string;
	user?: { fullName?: string; city?: string };
	rating: number;
	totalCompleted: number;
}

const Stepper = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 40px;
    overflow-x: auto;
    padding-bottom: 4px;
`;
const StepPill = styled.div<{ $on: boolean; $done: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    border-radius: var(--r-pill);
    border: 1px solid ${(p) => (p.$done || p.$on ? "var(--gold-wash-2)" : "var(--hairline)")};
    background: ${(p) => (p.$on ? "var(--gold-wash)" : p.$done ? "var(--surface)" : "transparent")};
    color: ${(p) => (p.$on ? "var(--gold-bright)" : p.$done ? "var(--ink)" : "var(--ink-muted)")};
    font-size: 13px;
    white-space: nowrap;
`;
const StepNum = styled.span<{ $on: boolean; $done: boolean }>`
    font-family: var(--display);
    font-size: 14px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${(p) => (p.$on ? "var(--gold-bright)" : p.$done ? "var(--gold-deep)" : "var(--surface-3)")};
    color: ${(p) => (p.$on ? "#1A1813" : "var(--ink)")};
    display: inline-flex;
    align-items: center;
    justify-content: center;
`;
const Grid = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const Panel = styled(Card)`padding: 32px;`;
const PanelTitle = styled.h2`
    font-family: var(--display);
    font-size: 28px;
    margin: 0 0 6px;
`;
const PanelLede = styled.p`color: var(--ink-soft); font-size: 14px; margin-bottom: 24px;`;
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
const TypeGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const TypeCard = styled.button<{ $selected: boolean }>`
    text-align: left;
    padding: 24px;
    border-radius: var(--r-md);
    background: ${(p) => (p.$selected ? "var(--surface-2)" : "var(--surface)")};
    border: 1px solid ${(p) => (p.$selected ? "var(--gold)" : "var(--hairline)")};
    color: var(--ink);
    cursor: pointer;
`;
const TypeName = styled.div`font-family: var(--display); font-size: 22px; margin-bottom: 6px;`;
const TypePrice = styled.div`font-family: var(--display); font-size: 28px; color: var(--gold-bright); margin-bottom: 14px;`;
const TypeDesc = styled.p`color: var(--ink-muted); font-size: 12px; line-height: 1.55;`;
const InspectorList = styled.div`display: flex; flex-direction: column; gap: 12px;`;
const InspectorRow = styled.div<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px;
    background: var(--surface-2);
    border: 1px solid ${(p) => (p.$selected ? "var(--gold)" : "var(--hairline)")};
    border-radius: var(--r-md);
`;
const Mug = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--surface-3), var(--surface-2));
    border: 1px solid var(--hairline);
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--gold);
    font-family: var(--display);
    font-size: 18px;
`;
const SlotGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 16px;
    @media (max-width: 540px) { grid-template-columns: repeat(2, 1fr); }
`;
const Slot = styled.button<{ $on: boolean }>`
    padding: 12px;
    border-radius: var(--r-sm);
    background: ${(p) => (p.$on ? "var(--gold-wash)" : "var(--surface-2)")};
    border: 1px solid ${(p) => (p.$on ? "var(--gold)" : "var(--hairline)")};
    color: ${(p) => (p.$on ? "var(--gold-bright)" : "var(--ink-soft)")};
    cursor: pointer;
    font-size: 13px;
`;
const Summary = styled(Card)`padding: 24px; position: sticky; top: 96px;`;
const Line = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    color: var(--ink-soft);
    font-size: 13px;
    border-bottom: 1px solid var(--hairline);
    &:last-of-type { border-bottom: none; }
`;
const Total = styled.div`
    display: flex;
    justify-content: space-between;
    padding-top: 14px;
    margin-top: 8px;
    border-top: 1px solid var(--hairline-strong);
    font-family: var(--display);
    font-size: 22px;
`;
const StepActions = styled.div`
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

const SLOTS = ["09:00", "11:00", "14:00", "16:00"];

// Compose a UTC ISO datetime from a calendar date + a fixed slot. The slot the
// buyer picks must be reflected in `scheduledFor` (not hardcoded to 09:00).
function isoForDateSlot(date: string, slot?: string): string {
	return new Date(`${date}T${slot ?? "09:00"}:00Z`).toISOString();
}

const TYPES: Array<{
	k: InspectionType;
	name: string;
	price: string;
	desc: string;
}> = [
	{
		k: "standard",
		name: "Standard",
		price: "₦32,000",
		desc: "50+ checkpoints. 30+ photos. 48-hour turnaround.",
	},
	{
		k: "premium",
		name: "Premium",
		price: "₦52,000",
		desc: "Top-tier inspectors. OBD2 scan. 24-hour turnaround.",
	},
	{
		k: "special_request",
		name: "Special",
		price: "Custom",
		desc: "Salvage, classics, fleet. Consultant-led intake.",
	},
];

export default function BookingWrapper({ step }: IProps) {
	const router = useRouter();
	const stepIndex = useMemo(
		() => STEPS.findIndex((s) => s.k === step),
		[step],
	);
	const next = NEXT_STEP[step];
	const [draft, setDraft] = useState<IDraft>(() => defaultDraft());
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		setDraft(readDraft());
	}, []);

	function patch(d: Partial<IDraft>) {
		setDraft((prev) => {
			const merged = { ...prev, ...d };
			writeDraft(merged);
			return merged;
		});
	}
	function patchCar(d: Partial<IDraft["car"]>) {
		setDraft((prev) => {
			const merged = { ...prev, car: { ...prev.car, ...d } };
			writeDraft(merged);
			return merged;
		});
	}

	const { data: inspectorsData } = useSWR<
		IResponseEnvelope<{ inspectors: IInspectorListItem[] }>
	>(
		step === "3"
			? `/api/inspectors?city=${encodeURIComponent(draft.car.city)}`
			: null,
		fetcher,
		{ revalidateOnMount: true },
	);
	const inspectors = inspectorsData?.data?.inspectors ?? [];

	const selectedDate = draft.scheduledFor
		? draft.scheduledFor.slice(0, 10)
		: "";
	const { data: availData } = useSWR<
		IResponseEnvelope<{ taken: string[]; available: string[] }>
	>(
		step === "4" && draft.assignedInspectorId && selectedDate
			? `/api/inspectors/${draft.assignedInspectorId}/availability?date=${selectedDate}`
			: null,
		fetcher,
		{ revalidateOnMount: true },
	);
	const takenSlots = availData?.data?.taken ?? [];

	const price = PRICE_BY_TYPE[draft.inspectionType];
	const total = price + PLATFORM_FEE;

	function missingRequiredFields(): string[] {
		const m: string[] = [];
		if (!draft.car.make.trim()) m.push("Make");
		if (!draft.car.model.trim()) m.push("Model");
		if (!draft.car.year || draft.car.year < 1980) m.push("Year");
		if (!draft.car.city.trim()) m.push("City");
		if (!draft.car.address.trim()) m.push("Address / landmark");
		return m;
	}

	function goNext() {
		if (!next) return;
		if (step === "1") {
			const missing = missingRequiredFields();
			if (missing.length) {
				setError(`Please fill in: ${missing.join(", ")}.`);
				return;
			}
		}
		setError(null);
		router.push(`/book/${next}`);
	}

	async function submitBooking() {
		if (busy) return;
		setError(null);

		const missing = missingRequiredFields();
		if (missing.length) {
			setError(
				`Missing required car details: ${missing.join(", ")}. Go back to step 1 to fix.`,
			);
			return;
		}

		setBusy(true);
		try {
			const createRes = await api().post("/api/inspections", {
				inspectionType: draft.inspectionType,
				car: draft.car,
				assignedInspectorId: draft.assignedInspectorId,
				scheduledFor: draft.scheduledFor,
				slot: draft.slot,
			});
			const inspection = createRes.data?.data?.inspection;
			if (!inspection?._id) throw new Error("Booking failed");
			await api().post("/api/transactions/initialize", {
				inspectionId: inspection._id,
			});
			if (typeof window !== "undefined") {
				try {
					window.localStorage.removeItem(DRAFT_KEY);
				} catch {
					// ignore
				}
			}
			router.push(`/inspections/${inspection._id}`);
			router.refresh();
		} catch (err) {
			setError(getErrorMessage(err, "Could not complete booking"));
			setBusy(false);
		}
	}

	return (
		<PageShell
			eyebrow="Booking"
			title="Book an"
			titleEm="inspection"
			navTitle={`Book · Step ${step} of 5`}
			subtitle="Five steps. Nothing is charged until you confirm."
		>
			<Stepper data-testid="booking-stepper">
				{STEPS.map((s, idx) => (
					<StepPill
						key={s.k}
						$on={idx === stepIndex}
						$done={idx < stepIndex}
					>
						<StepNum
							$on={idx === stepIndex}
							$done={idx < stepIndex}
						>
							{s.k}
						</StepNum>
						{s.label}
					</StepPill>
				))}
			</Stepper>

			<Grid>
				<Panel data-testid={`booking-step-${step}`}>
					{step === "1" && (
						<>
							<PanelTitle>Tell us about the car</PanelTitle>
							<PanelLede>
								Where it is and what it is — we'll match you
								with the right inspector.
							</PanelLede>
							<FormGrid>
								<Label>
									Seller type
									<select
										value={draft.car.sellerType}
										onChange={(e) =>
											patchCar({
												sellerType: e.target
													.value as SellerType,
											})
										}
									>
										<option value="dealership">
											Dealership
										</option>
										<option value="private">
											Private owner
										</option>
									</select>
								</Label>
								<Label>
									Year
									<input
										type="number"
										value={draft.car.year}
										onChange={(e) =>
											patchCar({
												year:
													Number(e.target.value) || 0,
											})
										}
									/>
								</Label>
								<Label>
									Make
									<input
										value={draft.car.make}
										onChange={(e) =>
											patchCar({ make: e.target.value })
										}
									/>
								</Label>
								<Label>
									Model
									<input
										value={draft.car.model}
										onChange={(e) =>
											patchCar({ model: e.target.value })
										}
									/>
								</Label>
								<Label>
									City
									<select
										value={draft.car.city}
										onChange={(e) =>
											patchCar({ city: e.target.value })
										}
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
								<Label>
									Address / landmark
									<span style={{ color: "var(--danger)" }}>
										*
									</span>
									<input
										required
										value={draft.car.address}
										onChange={(e) =>
											patchCar({
												address: e.target.value,
											})
										}
										placeholder="Lekki Phase 1, near…"
									/>
								</Label>
							</FormGrid>
							{error && <ErrorBox role="alert">{error}</ErrorBox>}
						</>
					)}

					{step === "2" && (
						<>
							<PanelTitle>Pick an inspection type</PanelTitle>
							<PanelLede>
								Three tiers. Each one ends with a verdict you
								can act on.
							</PanelLede>
							<TypeGrid>
								{TYPES.map((t) => (
									<TypeCard
										key={t.k}
										$selected={draft.inspectionType === t.k}
										type="button"
										onClick={() =>
											patch({ inspectionType: t.k })
										}
									>
										<TypeName>{t.name}</TypeName>
										<TypePrice>{t.price}</TypePrice>
										<TypeDesc>{t.desc}</TypeDesc>
									</TypeCard>
								))}
							</TypeGrid>
						</>
					)}

					{step === "3" && (
						<>
							<PanelTitle>Choose your inspector</PanelTitle>
							<PanelLede>
								Top-rated certified inspectors in{" "}
								{draft.car.city}. Tap to view full profile.
							</PanelLede>
							<InspectorList>
								{inspectors.length === 0 && (
									<div
										style={{
											color: "var(--ink-muted)",
											fontSize: 13,
											padding: "20px 0",
										}}
									>
										No inspectors loaded yet — your request
										will be auto-assigned.
									</div>
								)}
								{inspectors.map((p) => {
									const selected =
										draft.assignedInspectorId ===
										(p.userId ?? p._id);
									const userIdForSelect = String(
										p.userId ?? p._id,
									);
									return (
										<InspectorRow
											key={userIdForSelect}
											$selected={selected}
										>
											<Mug>
												{(p.user?.fullName ?? "??")
													.split(" ")
													.map((w) => w[0])
													.join("")
													.slice(0, 2)}
											</Mug>
											<div style={{ flex: 1 }}>
												<div
													style={{
														fontSize: 15,
														marginBottom: 4,
													}}
												>
													{p.user?.fullName ??
														"Inspector"}
												</div>
												<div
													style={{
														display: "flex",
														gap: 14,
														color: "var(--ink-muted)",
														fontSize: 12,
													}}
												>
													<span>
														{p.user?.city ?? "—"}
													</span>
													<span>
														{p.totalCompleted} jobs
													</span>
												</div>
											</div>
											<Stars rating={p.rating} />
											<Button
												variant={
													selected
														? "primary"
														: "secondary"
												}
												size="sm"
												onClick={() =>
													patch({
														assignedInspectorId:
															userIdForSelect,
													})
												}
											>
												{selected
													? "Selected"
													: "Select"}
											</Button>
										</InspectorRow>
									);
								})}
							</InspectorList>
						</>
					)}

					{step === "4" && (
						<>
							<PanelTitle>Pick a date & slot</PanelTitle>
							<PanelLede>
								Slots are fixed: 09:00, 11:00, 14:00, 16:00.
								Greyed-out times are unavailable.
							</PanelLede>
							<Label style={{ maxWidth: 240 }}>
								Date
								<input
									type="date"
									value={
										draft.scheduledFor
											? draft.scheduledFor.slice(0, 10)
											: ""
									}
									onChange={(e) => {
										const v = e.target.value;
										patch({
											scheduledFor: v
												? isoForDateSlot(v, draft.slot)
												: undefined,
										});
									}}
								/>
							</Label>
							<SlotGrid>
								{SLOTS.map((s) => {
									const taken = takenSlots.includes(s);
									return (
										<Slot
											key={s}
											$on={draft.slot === s}
											type="button"
											disabled={taken}
											title={
												taken
													? "Already booked"
													: undefined
											}
											style={
												taken
													? {
															opacity: 0.4,
															cursor: "not-allowed",
															textDecoration:
																"line-through",
														}
													: undefined
											}
											onClick={() => {
												if (taken) return;
												patch({
													slot: s,
													scheduledFor: selectedDate
														? isoForDateSlot(
																selectedDate,
																s,
															)
														: draft.scheduledFor,
												});
											}}
										>
											{s}
										</Slot>
									);
								})}
							</SlotGrid>
						</>
					)}

					{step === "5" && (
						<>
							<PanelTitle>Confirm and pay</PanelTitle>
							<PanelLede>
								Payment is held securely. The inspector is only
								locked to the job after Paystack confirms.
							</PanelLede>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: 12,
									color: "var(--ink-soft)",
									fontSize: 14,
								}}
							>
								<div>
									<Icon name="car" size={14} />{" "}
									{draft.car.make} {draft.car.model}{" "}
									{draft.car.year} —{" "}
									{draft.car.address || draft.car.city}
								</div>
								<div>
									<Icon name="shield-check" size={14} />{" "}
									{draft.inspectionType} inspection
								</div>
								<div>
									<Icon name="calendar" size={14} />{" "}
									{draft.scheduledFor
										? `${new Date(draft.scheduledFor).toLocaleDateString()} · ${draft.slot ?? "—"}`
										: "Date pending"}
								</div>
							</div>
							{error && <ErrorBox role="alert">{error}</ErrorBox>}
						</>
					)}

					<StepActions>
						{stepIndex > 0 ? (
							<Link href={`/book/${stepIndex}`}>
								<Button
									variant="ghost"
									size="md"
									icon="chevron-left"
								>
									Back
								</Button>
							</Link>
						) : (
							<span></span>
						)}
						{step === "5" ? (
							<Button
								variant="primary"
								size="md"
								iconRight="chevron-right"
								disabled={busy}
								onClick={submitBooking}
							>
								{busy
									? "Processing…"
									: `Pay (mock) · ₦${total.toLocaleString()}`}
							</Button>
						) : (
							<Button
								variant="primary"
								size="md"
								iconRight="chevron-right"
								onClick={goNext}
							>
								Continue
							</Button>
						)}
					</StepActions>
				</Panel>

				<Summary>
					<div
						style={{
							color: "var(--ink-muted)",
							fontSize: 11,
							letterSpacing: "0.16em",
							textTransform: "uppercase",
							marginBottom: 14,
						}}
					>
						Summary
					</div>
					<Line>
						<span>Inspection</span>
						<span>{draft.inspectionType}</span>
					</Line>
					<Line>
						<span>Fee</span>
						<span>₦{price.toLocaleString()}</span>
					</Line>
					<Line>
						<span>Platform service</span>
						<span>₦{PLATFORM_FEE.toLocaleString()}</span>
					</Line>
					<Total>
						<span>Total</span>
						<span>₦{total.toLocaleString()}</span>
					</Total>
					<div style={{ marginTop: 18 }}>
						<Pill tone="ghost" dot>
							Escrow protected
						</Pill>
					</div>
				</Summary>
			</Grid>
		</PageShell>
	);
}
