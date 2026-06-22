"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styled from "styled-components";
import useSWR from "swr";
import { Button, Card, Eyebrow, Icon, Pill } from "@/components";
import { api, fetcher } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

interface IInspection {
	_id: string;
	status: string;
	car: {
		make: string;
		model: string;
		year: number;
		sellerContact?: string;
		address?: string;
	};
	scheduledFor?: string;
	slot?: string;
	price: number;
	platformFee: number;
	assignedAt?: string;
	createdAt?: string;
	acceptedAt?: string;
	sellerContactedAt?: string;
}

interface IProps {
	id: string;
	// Runtime-config slice resolved server-side from /admin/settings — drives
	// the accept-window countdown, payout percentage, and copy on this page.
	acceptWindowMinutes: number;
	sellerContactWindowHours: number;
	reportDeadlineHours: number;
	inspectorPayoutPercent: number;
}

const Grid = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const Section = styled(Card)`padding: 24px;`;
const Spec = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
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
`;
const Countdown = styled.div`
    padding: 18px 22px;
    border-radius: var(--r-md);
    background: var(--caution-wash);
    border: 1px solid var(--caution-deep);
    color: var(--caution);
    margin-bottom: 16px;
`;

function fmtCountdown(ms: number) {
	const mins = Math.max(0, Math.floor(ms / 60_000));
	const secs = Math.max(0, Math.floor((ms % 60_000) / 1000));
	return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function JobDetailWrapper({
	id,
	acceptWindowMinutes,
	sellerContactWindowHours,
	reportDeadlineHours,
	inspectorPayoutPercent,
}: IProps) {
	const router = useRouter();
	const { data, mutate } = useSWR<
		IResponseEnvelope<{ inspection: IInspection }>
	>(`/api/inspections/${id}`, fetcher, { revalidateOnMount: true });
	const ins = data?.data?.inspection;
	const [now, setNow] = useState(() => Date.now());
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, []);

	const acceptWindowMs = acceptWindowMinutes * 60_000;
	// The accept window runs from when the job was offered to this inspector
	// (assignedAt), not from the appointment time (scheduledFor).
	const offeredAt = ins?.assignedAt ?? ins?.createdAt;
	const deadlineMs = offeredAt
		? new Date(offeredAt).getTime() + acceptWindowMs
		: null;
	const remaining = deadlineMs ? deadlineMs - now : acceptWindowMs;
	const payoutFraction = inspectorPayoutPercent / 100;

	async function patchStatus(patch: Record<string, unknown>) {
		if (busy || !ins) return;
		setBusy(true);
		try {
			await api().patch(`/api/inspections/${ins._id}`, patch);
			mutate();
		} finally {
			setBusy(false);
		}
	}

	async function decline() {
		if (busy || !ins) return;
		if (
			typeof window !== "undefined" &&
			!window.confirm(
				"Decline this job? It will go back into the pool for reassignment.",
			)
		) {
			return;
		}
		setBusy(true);
		try {
			await api().patch(`/api/inspections/${ins._id}`, {
				status: "declined",
			});
			router.push("/inspector/dashboard");
		} finally {
			setBusy(false);
		}
	}

	const car = ins?.car ?? { make: "", model: "", year: 0 };
	const title = ins ? `${car.make} ${car.model}` : "Job";

	return (
		<PageShell
			eyebrow={`Job · ${id}`}
			title={title}
			titleEm={String(car.year || "")}
			navTitle={`Job ${id}`}
			subtitle={`Accept the job within ${acceptWindowMinutes} minutes. Then contact the seller within ${sellerContactWindowHours} hours.`}
		>
			<Grid>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 24,
					}}
				>
					<Section>
						<Eyebrow $gold style={{ marginBottom: 14 }}>
							Car details
						</Eyebrow>
						<Spec>
							{[
								["Year", String(car.year || "")],
								["Make", car.make || ""],
								["Model", car.model || ""],
								["Address", ins?.car.address ?? ""],
							].map(([k, v]) => (
								<SpecRow key={k}>
									<span>{k}</span>
									<span>{v}</span>
								</SpecRow>
							))}
						</Spec>
					</Section>

					<Section>
						<Eyebrow $gold style={{ marginBottom: 14 }}>
							Seller
						</Eyebrow>
						<div style={{ fontSize: 14, marginBottom: 12 }}>
							{ins?.car.sellerContact ??
								"Contact details will appear once you accept."}
						</div>
						<div
							style={{
								display: "flex",
								gap: 12,
								alignItems: "center",
							}}
						>
							{ins?.car.sellerContact && (
								<a href={`tel:${ins.car.sellerContact}`}>
									<Button
										variant="primary"
										size="sm"
										icon="phone"
									>
										Call seller
									</Button>
								</a>
							)}
							<Button
								variant="secondary"
								size="sm"
								icon="check"
								disabled={
									!ins || !!ins.sellerContactedAt || busy
								}
								onClick={() =>
									patchStatus({
										sellerContactedAt:
											new Date().toISOString(),
									})
								}
							>
								{ins?.sellerContactedAt
									? "Contacted ✓"
									: "Mark contacted"}
							</Button>
						</div>
					</Section>
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 16,
					}}
				>
					<Countdown data-testid="countdown">
						<Eyebrow style={{ color: "var(--caution)" }}>
							Accept window
						</Eyebrow>
						<div
							style={{
								fontFamily: "var(--display)",
								fontSize: 32,
								marginTop: 6,
							}}
						>
							{fmtCountdown(remaining)}
						</div>
					</Countdown>

					<Section>
						<Eyebrow $gold style={{ marginBottom: 12 }}>
							Schedule
						</Eyebrow>
						<div style={{ fontSize: 14, marginBottom: 6 }}>
							<Icon name="calendar" size={14} />{" "}
							{ins?.scheduledFor
								? `${new Date(ins.scheduledFor).toLocaleDateString()} · ${ins.slot ?? ""}`
								: "Not scheduled"}
						</div>
					</Section>

					<Section>
						<Eyebrow $gold style={{ marginBottom: 12 }}>
							Payout
						</Eyebrow>
						<div
							style={{
								fontFamily: "var(--display)",
								fontSize: 28,
								color: "var(--gold-bright)",
							}}
						>
							₦
							{ins
								? Math.floor(
										ins.price * payoutFraction,
									).toLocaleString()
								: "—"}
						</div>
						<Pill tone="ghost" style={{ marginTop: 10 }}>
							Held {reportDeadlineHours} h after submit
						</Pill>
					</Section>

					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 10,
						}}
					>
						{ins &&
							!ins.acceptedAt &&
							ins.status !== "declined" && (
								<>
									<Button
										variant="primary"
										size="md"
										fullWidth
										icon="check"
										disabled={busy}
										onClick={() =>
											patchStatus({
												acceptedAt:
													new Date().toISOString(),
												status: "scheduled",
											})
										}
									>
										Accept job
									</Button>
									<Button
										variant="secondary"
										size="md"
										fullWidth
										icon="x"
										disabled={busy}
										onClick={decline}
									>
										Decline job
									</Button>
								</>
							)}
						{ins?.acceptedAt && (
							<>
								<Link
									href={`/inspector/inspections/${id}/live`}
								>
									<Button
										variant="primary"
										size="md"
										fullWidth
										iconRight="chevron-right"
									>
										Start inspection
									</Button>
								</Link>
								<Link
									href={`/inspector/inspections/${id}/report`}
								>
									<Button
										variant="secondary"
										size="md"
										fullWidth
										icon="edit"
									>
										Submit report
									</Button>
								</Link>
							</>
						)}
					</div>
				</div>
			</Grid>
		</PageShell>
	);
}
