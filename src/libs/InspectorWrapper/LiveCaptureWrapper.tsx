"use client";

import { useMemo, useRef, useState } from "react";
import styled from "styled-components";
import useSWR from "swr";
import { Button, Card, Eyebrow, Icon, Pill } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

interface IProps {
	id: string;
}

type SectionKey = "exterior" | "interior" | "engine" | "test_drive" | "other";

const SECTIONS: Array<{ k: SectionKey; label: string }> = [
	{ k: "exterior", label: "Exterior" },
	{ k: "interior", label: "Interior" },
	{ k: "engine", label: "Engine" },
	{ k: "test_drive", label: "Test Drive" },
	{ k: "other", label: "Other" },
];

interface IPhoto {
	_id: string;
	section: SectionKey;
	sequence: number;
	url: string;
}

const Grid = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const Section = styled(Card)`padding: 24px;`;
const SectionPicker = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 18px;
`;
const Pick = styled.button<{ $on: boolean }>`
    padding: 8px 14px;
    border-radius: var(--r-pill);
    background: ${(p) => (p.$on ? "var(--gold-wash)" : "transparent")};
    border: 1px solid ${(p) => (p.$on ? "var(--gold-wash-2)" : "var(--hairline)")};
    color: ${(p) => (p.$on ? "var(--gold-bright)" : "var(--ink-soft)")};
    font-size: 12px;
    cursor: pointer;
`;
const Stage = styled.div`
    aspect-ratio: 4 / 3;
    border-radius: var(--r-md);
    background:
        radial-gradient(120% 90% at 50% 0%, rgba(201,169,97,0.10), transparent 60%),
        var(--surface-2);
    border: 1px solid var(--hairline);
    display: grid;
    place-items: center;
    color: var(--ink-muted);
`;
const Captures = styled.div`
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    @media (max-width: 540px) { grid-template-columns: repeat(3, 1fr); }
`;
const Thumb = styled.div`
    aspect-ratio: 1;
    background: var(--surface-2);
    border: 1px solid var(--hairline);
    border-radius: var(--r-sm);
    display: grid;
    place-items: center;
    color: var(--ink-faint);
    overflow: hidden;
    position: relative;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }
`;
const PendingThumb = styled(Thumb)`
    opacity: 0.6;
`;
const Composer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    input {
        flex: 1;
        padding: 12px 16px;
        background: var(--surface-2);
        border: 1px solid var(--hairline);
        border-radius: var(--r-pill);
        color: var(--ink);
        font-size: 13px;
    }
`;
const ErrorBox = styled.div`
    margin-top: 12px;
    padding: 8px 12px;
    background: var(--danger-wash);
    border: 1px solid var(--danger-deep);
    border-radius: var(--r-sm);
    color: var(--danger);
    font-size: 13px;
`;

export default function LiveCaptureWrapper({ id }: IProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [current, setCurrent] = useState<SectionKey>("exterior");
	const [note, setNote] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	// Pending uploads = optimistic placeholder tiles shown while the POST is
	// in flight. Stored as nonces so each tile has a stable React key without
	// relying on the array index. Cleared on POST resolution.
	const [pending, setPending] = useState<string[]>([]);

	const { data: photoData, mutate: refreshPhotos } = useSWR<
		IResponseEnvelope<{ photos: IPhoto[] }>
	>(`/api/inspections/${id}/photos`, fetcher, { revalidateOnMount: true });
	const photos = photoData?.data?.photos ?? [];
	const count = photos.length;
	const min = 30;

	async function setSection(s: SectionKey) {
		setCurrent(s);
		try {
			await api().patch(`/api/inspections/${id}`, {
				currentSection: SECTIONS.find((x) => x.k === s)?.label ?? s,
				...(count === 0
					? {
							startedAt: new Date().toISOString(),
							status: "in_progress",
						}
					: {}),
			});
		} catch {
			// non-fatal
		}
	}

	async function capture(file?: File) {
		if (busy) return;
		setBusy(true);
		setError(null);
		const nonce = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		setPending((p) => [...p, nonce]);
		try {
			const fd = new FormData();
			fd.set("section", current);
			if (note) fd.set("note", note);
			if (file) {
				fd.set("photo", file);
			}
			// Don't set Content-Type — the browser must inject the boundary
			// parameter. axios will fill it in for FormData bodies.
			await api().post(`/api/inspections/${id}/photos`, fd);
			setNote("");
			await refreshPhotos();
		} catch (err) {
			setError(getErrorMessage(err, "Capture failed"));
		} finally {
			setPending((p) => p.filter((n) => n !== nonce));
			setBusy(false);
		}
	}

	async function completePhysical() {
		try {
			await api().patch(`/api/inspections/${id}`, {
				status: "report_processing",
				completedPhysicalAt: new Date().toISOString(),
			});
			window.location.href = `/inspector/inspections/${id}/report`;
		} catch (err) {
			setError(getErrorMessage(err, "Could not finish"));
		}
	}

	const sectionCounts = useMemo(() => {
		const c: Record<string, number> = {};
		for (const p of photos) c[p.section] = (c[p.section] ?? 0) + 1;
		return c;
	}, [photos]);

	return (
		<PageShell
			eyebrow={`Capture · ${id}`}
			title="Live capture"
			titleEm="in progress"
			navTitle="Capture"
			subtitle="Every photo streams to the buyer in real time. Aim for 30+ across all sections."
			right={
				<Pill
					tone={count >= min ? "good" : "gold"}
					dot={count < min}
					data-testid="photo-count-pill"
				>
					{count}/{min} photos
				</Pill>
			}
		>
			<Grid>
				<Section>
					<Eyebrow $gold style={{ marginBottom: 12 }}>
						Currently examining
					</Eyebrow>
					<SectionPicker data-testid="section-picker">
						{SECTIONS.map((s) => (
							<Pick
								key={s.k}
								$on={current === s.k}
								onClick={() => setSection(s.k)}
								type="button"
							>
								{s.label}
							</Pick>
						))}
					</SectionPicker>
					<Stage>
						<div style={{ textAlign: "center" }}>
							<Icon name="camera" size={36} />
							<div
								style={{
									marginTop: 12,
									color: "var(--ink-soft)",
									fontSize: 13,
								}}
							>
								Tap capture ·{" "}
								{SECTIONS.find((x) => x.k === current)?.label}
							</div>
						</div>
					</Stage>
					<Composer>
						<input
							placeholder="Optional note for this photo…"
							value={note}
							onChange={(e) => setNote(e.target.value)}
						/>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							capture="environment"
							style={{ display: "none" }}
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) capture(f);
								if (fileInputRef.current)
									fileInputRef.current.value = "";
							}}
						/>
						<Button
							variant="primary"
							size="md"
							icon="camera"
							disabled={busy}
							onClick={() => {
								if (fileInputRef.current) {
									fileInputRef.current.click();
								} else {
									capture();
								}
							}}
						>
							Capture
						</Button>
					</Composer>
					{error && <ErrorBox>{error}</ErrorBox>}
					<Captures data-testid="captures">
						{photos.map((p) => (
							<Thumb key={p._id} data-testid="capture-thumb">
								{p.url ? (
									// biome-ignore lint/performance/noImgElement: signed S3 URLs change every hour; configuring next/image remote patterns per env is more friction than the LCP gain on a private inspector view.
									<img
										src={p.url}
										alt={`Capture ${p.sequence}`}
									/>
								) : (
									<Icon name="camera" size={14} />
								)}
							</Thumb>
						))}
						{pending.map((nonce) => (
							<PendingThumb
								key={nonce}
								data-testid="capture-thumb-pending"
							>
								<Icon name="camera" size={14} />
							</PendingThumb>
						))}
					</Captures>
				</Section>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 16,
					}}
				>
					<Section>
						<Eyebrow $gold style={{ marginBottom: 12 }}>
							Progress
						</Eyebrow>
						{SECTIONS.map((s) => (
							<div
								key={s.k}
								style={{
									display: "flex",
									justifyContent: "space-between",
									padding: "10px 0",
									borderBottom: "1px solid var(--hairline)",
									fontSize: 13,
								}}
							>
								<span style={{ color: "var(--ink-soft)" }}>
									{s.label}
								</span>
								<span style={{ color: "var(--ink-muted)" }}>
									{s.k === current
										? "now"
										: `${sectionCounts[s.k] ?? 0} photos`}
								</span>
							</div>
						))}
					</Section>
					<Button
						variant="primary"
						size="md"
						fullWidth
						iconRight="chevron-right"
						disabled={count < min}
						onClick={completePhysical}
					>
						{count < min
							? `Need ${min - count} more photos`
							: "Complete physical inspection"}
					</Button>
				</div>
			</Grid>
		</PageShell>
	);
}
