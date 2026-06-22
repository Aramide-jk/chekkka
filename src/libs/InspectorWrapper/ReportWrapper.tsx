"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styled from "styled-components";
import useSWR from "swr";
import { Button, Card, Eyebrow, Pill } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

interface IProps {
	id: string;
}

type Status = "good" | "minor" | "serious" | "n/a";

interface IChecklistItem {
	label: string;
	status: Status;
	comment?: string;
}

interface IInspection {
	_id: string;
	status: string;
	reportLockedAt?: string;
	car: { make: string; model: string; year: number };
}

const DEFAULT_SECTIONS: Record<string, string[]> = {
	Exterior: [
		"Body alignment",
		"Paint",
		"Scratches",
		"Dents",
		"Rust",
		"Tyres",
	],
	Interior: ["Dashboard", "Seats", "AC", "Infotainment", "Locks"],
	Mechanical: [
		"Engine",
		"Oil",
		"Cooling",
		"Battery",
		"Brakes",
		"Transmission",
	],
	"Road Test": ["Starting", "Steering", "Braking", "OBD2"],
};
type SectionKey = keyof typeof DEFAULT_SECTIONS;
const _SECTION_KEY_MAP: Record<
	SectionKey,
	"exterior" | "interior" | "mechanical" | "roadTest"
> = {
	Exterior: "exterior",
	Interior: "interior",
	Mechanical: "mechanical",
	"Road Test": "roadTest",
};

const Tabs = styled.div`
    display: flex;
    gap: 6px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--hairline);
`;
const Tab = styled.button<{ $on: boolean }>`
    padding: 12px 16px;
    background: transparent;
    color: ${(p) => (p.$on ? "var(--gold-bright)" : "var(--ink-muted)")};
    border: none;
    border-bottom: 2px solid ${(p) => (p.$on ? "var(--gold)" : "transparent")};
    font-size: 13px;
    cursor: pointer;
`;
const Section = styled(Card)`padding: 24px;`;
const ItemRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--hairline);
    &:last-child { border-bottom: none; }
`;
const ItemWrap = styled.div`
    padding: 12px 0;
    border-bottom: 1px solid var(--hairline);
    &:last-child { border-bottom: none; }
`;
const CommentInput = styled.textarea`
    margin-top: 10px;
    width: 100%;
    padding: 10px 12px;
    background: var(--surface-2);
    border: 1px solid var(--hairline-strong);
    border-radius: var(--r-sm);
    color: var(--ink);
    font-family: var(--sans);
    font-size: 13px;
    resize: vertical;
`;
const StatusBtns = styled.div`display: flex; gap: 6px;`;
const StatusBtn = styled.button<{ $on: boolean; $status: Status }>`
    padding: 6px 12px;
    border-radius: var(--r-pill);
    background: ${(p) =>
		p.$on
			? p.$status === "good"
				? "var(--good-wash)"
				: p.$status === "minor"
					? "var(--caution-wash)"
					: p.$status === "serious"
						? "var(--danger-wash)"
						: "var(--surface-2)"
			: "transparent"};
    border: 1px solid ${(p) =>
		p.$on
			? p.$status === "good"
				? "var(--good-deep)"
				: p.$status === "minor"
					? "var(--caution-deep)"
					: p.$status === "serious"
						? "var(--danger-deep)"
						: "var(--hairline-strong)"
			: "var(--hairline)"};
    color: ${(p) =>
		p.$on
			? p.$status === "good"
				? "var(--good)"
				: p.$status === "minor"
					? "var(--caution)"
					: p.$status === "serious"
						? "var(--danger)"
						: "var(--ink-soft)"
			: "var(--ink-muted)"};
    font-size: 11px;
    cursor: pointer;
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

const STATUSES: Status[] = ["good", "minor", "serious", "n/a"];

function buildInitialReport() {
	const out: Record<string, IChecklistItem[]> = {};
	for (const k of Object.keys(DEFAULT_SECTIONS)) {
		out[k] = DEFAULT_SECTIONS[k as SectionKey].map((label) => ({
			label,
			status: "good",
		}));
	}
	return out;
}

export default function ReportWrapper({ id }: IProps) {
	const router = useRouter();
	const { data } = useSWR<IResponseEnvelope<{ inspection: IInspection }>>(
		`/api/inspections/${id}`,
		fetcher,
		{ revalidateOnMount: true },
	);
	const ins = data?.data?.inspection;
	const locked = !!ins?.reportLockedAt;

	const [tab, setTab] = useState<SectionKey | "Verdict">("Exterior");
	const [sections, setSections] =
		useState<Record<string, IChecklistItem[]>>(buildInitialReport);
	const [verdict, setVerdict] = useState<"good" | "caution" | "danger">(
		"good",
	);
	const [summary, setSummary] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		// nothing to backfill on first load — report is created on submit
	}, []);

	function setItemStatus(
		sectionLabel: string,
		label: string,
		status: Status,
	) {
		setSections((prev) => {
			const next = { ...prev };
			next[sectionLabel] = next[sectionLabel].map((i) =>
				i.label === label ? { ...i, status } : i,
			);
			return next;
		});
	}

	function setItemComment(
		sectionLabel: string,
		label: string,
		comment: string,
	) {
		setSections((prev) => {
			const next = { ...prev };
			next[sectionLabel] = next[sectionLabel].map((i) =>
				i.label === label ? { ...i, comment } : i,
			);
			return next;
		});
	}

	async function submit() {
		if (busy || locked) return;

		// Every minor/serious item must carry a comment — enforce it client-side
		// and jump the inspector to the first offending section.
		const allItems = Object.entries(sections);
		for (const [sectionLabel, items] of allItems) {
			const offending = items.find(
				(i) =>
					(i.status === "minor" || i.status === "serious") &&
					!i.comment?.trim(),
			);
			if (offending) {
				setTab(sectionLabel as SectionKey);
				setError(
					`Add a comment for "${offending.label}" — every minor or serious item needs one.`,
				);
				return;
			}
		}
		if (!summary.trim()) {
			setTab("Verdict");
			setError("Write a short summary for the buyer before submitting.");
			return;
		}

		// Derive the at-a-glance counts the buyer's Overview tab reads.
		const flat = allItems.flatMap(([, items]) => items);
		const counts = flat.reduce(
			(acc, i) => {
				if (i.status === "good") acc.passed++;
				else if (i.status === "minor") acc.minor++;
				else if (i.status === "serious") acc.serious++;
				return acc;
			},
			{ passed: 0, minor: 0, serious: 0 },
		);
		const fixes = flat
			.filter((i) => i.status === "minor" || i.status === "serious")
			.map((i) => ({
				label: i.label,
				priority: (i.status === "serious" ? "High" : "Medium") as
					| "Low"
					| "Medium"
					| "High",
			}));

		setBusy(true);
		setError(null);
		try {
			const report = {
				overview: ins?.car
					? {
							make: ins.car.make,
							model: ins.car.model,
							year: ins.car.year,
						}
					: {},
				exterior: sections.Exterior,
				interior: sections.Interior,
				mechanical: sections.Mechanical,
				roadTest: sections["Road Test"],
				verdict,
				summary: {
					passed: counts.passed,
					minor: counts.minor,
					serious: counts.serious,
					written: summary,
					fixes,
				},
			};
			await api().patch(`/api/inspections/${id}/report`, {
				report,
				lock: true,
			});
			router.push(`/inspections/${id}`);
			router.refresh();
		} catch (err) {
			setError(getErrorMessage(err, "Could not submit report"));
			setBusy(false);
		}
	}

	const verdictPills: Array<{
		k: "good" | "caution" | "danger";
		label: string;
	}> = [
		{ k: "good", label: "Worth Buying" },
		{ k: "caution", label: "Buy With Caution" },
		{ k: "danger", label: "Not Recommended" },
	];

	return (
		<PageShell
			eyebrow={`Report · ${id}`}
			title="Submit"
			titleEm="report"
			navTitle="Report"
			subtitle="Every minor or serious item must include a comment. Once submitted, the report is locked."
		>
			<Tabs data-testid="report-tabs">
				{[
					...(Object.keys(DEFAULT_SECTIONS) as SectionKey[]),
					"Verdict" as const,
				].map((t) => (
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

			{tab !== "Verdict" && (
				<Section data-testid={`report-section-${tab}`}>
					<Eyebrow $gold style={{ marginBottom: 14 }}>
						{tab}
					</Eyebrow>
					{sections[tab as SectionKey].map((item) => {
						const needsComment =
							item.status === "minor" ||
							item.status === "serious";
						return (
							<ItemWrap key={item.label}>
								<ItemRow style={{ border: "none", padding: 0 }}>
									<span style={{ fontSize: 14 }}>
										{item.label}
									</span>
									<StatusBtns>
										{STATUSES.map((s) => (
											<StatusBtn
												key={s}
												$on={item.status === s}
												$status={s}
												onClick={() =>
													setItemStatus(
														tab,
														item.label,
														s,
													)
												}
												type="button"
											>
												{s}
											</StatusBtn>
										))}
									</StatusBtns>
								</ItemRow>
								{needsComment && (
									<CommentInput
										rows={2}
										value={item.comment ?? ""}
										onChange={(e) =>
											setItemComment(
												tab,
												item.label,
												e.target.value,
											)
										}
										placeholder={`Describe the ${item.status} issue with ${item.label.toLowerCase()}…`}
									/>
								)}
							</ItemWrap>
						);
					})}
					{error && <ErrorBox>{error}</ErrorBox>}
				</Section>
			)}

			{tab === "Verdict" && (
				<Section>
					<Eyebrow $gold style={{ marginBottom: 14 }}>
						Final verdict
					</Eyebrow>
					<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
						{verdictPills.map((v) => (
							<Pill
								key={v.k}
								tone={
									v.k === "good"
										? "good"
										: v.k === "caution"
											? "caution"
											: "danger"
								}
							>
								<button
									type="button"
									onClick={() => setVerdict(v.k)}
									style={{
										background: "transparent",
										border: "none",
										color: "inherit",
										cursor: "pointer",
										fontFamily: "inherit",
										fontSize: "inherit",
										letterSpacing: "inherit",
										textTransform: "inherit",
										padding: 0,
									}}
								>
									{v.k === verdict ? "✓ " : ""}
									{v.label}
								</button>
							</Pill>
						))}
					</div>
					<label style={{ marginTop: 18, display: "block" }}>
						<span
							style={{
								color: "var(--ink-soft)",
								fontSize: 12,
								display: "block",
								marginBottom: 6,
							}}
						>
							Summary for the buyer
						</span>
						<textarea
							rows={5}
							value={summary}
							onChange={(e) => setSummary(e.target.value)}
							placeholder="Two to three sentences summarising your findings…"
							style={{
								width: "100%",
								padding: "12px 14px",
								background: "var(--surface-2)",
								border: "1px solid var(--hairline-strong)",
								borderRadius: "var(--r-sm)",
								color: "var(--ink)",
								fontFamily: "var(--sans)",
								fontSize: 14,
							}}
						/>
					</label>
					{error && <ErrorBox>{error}</ErrorBox>}
					<div style={{ marginTop: 18 }}>
						<Button
							variant="primary"
							size="md"
							iconRight="check"
							onClick={submit}
							disabled={busy || locked}
						>
							{locked
								? "Report locked"
								: busy
									? "Submitting…"
									: "Submit & lock report"}
						</Button>
					</div>
				</Section>
			)}
		</PageShell>
	);
}
