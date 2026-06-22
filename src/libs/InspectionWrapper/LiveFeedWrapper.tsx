"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import useSWR from "swr";
import { Card, Eyebrow, Icon, Pill } from "@/components";
import { fetcher } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

interface IProps {
	id: string;
}

interface IPhoto {
	_id: string;
	section: "exterior" | "interior" | "engine" | "test_drive" | "other";
	url: string;
	note?: string;
	sequence: number;
	takenAt: string;
}

interface IInspection {
	_id: string;
	currentSection?: string;
	startedAt?: string;
	car: { make: string; model: string; year: number };
	photoCount: number;
}

const SECTIONS: Array<IPhoto["section"]> = [
	"exterior",
	"interior",
	"engine",
	"test_drive",
	"other",
];

const SECTION_LABEL: Record<IPhoto["section"], string> = {
	exterior: "Exterior",
	interior: "Interior",
	engine: "Engine",
	test_drive: "Test Drive",
	other: "Other",
};

const Grid = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const Section = styled(Card)`padding: 24px;`;
const StickyBar = styled.div`
    position: sticky;
    top: 80px;
    z-index: 5;
    background: linear-gradient(180deg, var(--bg) 80%, transparent);
    padding: 12px 0 16px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;
const Now = styled.div`
    color: var(--gold-bright);
    font-family: var(--display);
    font-size: 20px;
`;
const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    @media (max-width: 540px) { grid-template-columns: repeat(2, 1fr); }
`;
const PhotoTile = styled.div`
    position: relative;
    aspect-ratio: 4 / 3;
    background:
        radial-gradient(120% 90% at 50% 0%, rgba(201,169,97,0.10), transparent 60%),
        var(--surface-2);
    border: 1px solid var(--hairline);
    border-radius: var(--r-sm);
    display: grid;
    place-items: center;
    color: var(--ink-muted);
    overflow: hidden;
    animation: pop 0.3s ease both;
    @keyframes pop {
        from { transform: scale(0.92); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
`;
const PhotoLabel = styled.div`
    position: absolute;
    bottom: 6px;
    left: 6px;
    background: rgba(14,13,10,0.7);
    color: var(--ink-soft);
    font-size: 11px;
    padding: 4px 8px;
    border-radius: var(--r-pill);
    backdrop-filter: blur(8px);
`;
const Side = styled.div`display: flex; flex-direction: column; gap: 16px;`;
const SectionList = styled.div`display: flex; flex-direction: column; gap: 8px;`;
const SectionRow = styled.div<{ $on: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-radius: var(--r-sm);
    background: ${(p) => (p.$on ? "var(--gold-wash)" : "transparent")};
    border: 1px solid ${(p) => (p.$on ? "var(--gold-wash-2)" : "var(--hairline)")};
    color: ${(p) => (p.$on ? "var(--gold-bright)" : "var(--ink-soft)")};
    font-size: 13px;
`;
const Empty = styled.div`
    color: var(--ink-muted);
    font-size: 13px;
    padding: 36px 0;
    text-align: center;
`;

function elapsedSince(s?: string) {
	if (!s) return "—";
	const ms = Date.now() - new Date(s).getTime();
	const min = Math.max(0, Math.floor(ms / 60_000));
	return `${min} min elapsed`;
}

export default function LiveFeedWrapper({ id }: IProps) {
	const isSynthetic = id === "sample" || id === "shared";

	const { data: insData } = useSWR<
		IResponseEnvelope<{ inspection: IInspection }>
	>(isSynthetic ? null : `/api/inspections/${id}`, fetcher, {
		revalidateOnMount: true,
	});

	const [photos, setPhotos] = useState<IPhoto[]>([]);
	const [currentSection, setCurrentSection] = useState<string | null>(null);
	const [connected, setConnected] = useState(false);
	const esRef = useRef<EventSource | null>(null);

	useEffect(() => {
		if (isSynthetic || typeof window === "undefined") return;
		const es = new EventSource(`/api/inspections/${id}/live`);
		esRef.current = es;
		es.addEventListener("hello", () => setConnected(true));
		es.addEventListener("snapshot", (ev) => {
			try {
				const data = JSON.parse((ev as MessageEvent).data) as {
					photos: IPhoto[];
					currentSection: string | null;
				};
				setPhotos(data.photos);
				setCurrentSection(data.currentSection);
			} catch {
				// ignore
			}
		});
		es.addEventListener("photo", (ev) => {
			try {
				const data = JSON.parse((ev as MessageEvent).data) as {
					photo?: IPhoto;
				};
				const photo = data.photo;
				if (!photo) return;
				setPhotos((prev) =>
					prev.find((p) => p._id === photo._id)
						? prev
						: [...prev, photo],
				);
			} catch {
				// ignore
			}
		});
		es.addEventListener("section", (ev) => {
			try {
				const data = JSON.parse((ev as MessageEvent).data) as {
					section?: string;
				};
				if (data.section) setCurrentSection(data.section);
			} catch {
				// ignore
			}
		});
		es.onerror = () => setConnected(false);
		return () => {
			es.close();
			esRef.current = null;
		};
	}, [id, isSynthetic]);

	const ins = insData?.data?.inspection;
	const total = photos.length || ins?.photoCount || 0;

	const counts = useMemo(() => {
		const c: Record<string, number> = {};
		for (const p of photos) c[p.section] = (c[p.section] ?? 0) + 1;
		return c;
	}, [photos]);

	const title = ins ? `${ins.car.make} ${ins.car.model}` : "Live feed";

	return (
		<PageShell
			eyebrow={`Live · ${id}`}
			title={title}
			titleEm="live now"
			navTitle="Live feed"
			subtitle="Every photo the inspector takes streams here in real time."
			right={
				<Pill tone="gold" dot={connected}>
					{total} photos so far
				</Pill>
			}
		>
			<StickyBar>
				<div>
					<Eyebrow $gold>Currently examining</Eyebrow>
					<Now>{currentSection ?? "Waiting for inspector…"}</Now>
				</div>
				<Pill tone={connected ? "gold" : "ghost"} dot>
					{connected ? "Live" : "Connecting…"}
				</Pill>
			</StickyBar>

			<Grid>
				<Section data-testid="live-photos">
					<Eyebrow $gold style={{ marginBottom: 12 }}>
						Stream
					</Eyebrow>
					{photos.length === 0 ? (
						<Empty>
							No photos yet. The inspector will start capturing
							soon.
						</Empty>
					) : (
						<PhotoGrid>
							{photos.map((p) => (
								<PhotoTile key={p._id}>
									<Icon name="camera" size={20} />
									<PhotoLabel>
										{SECTION_LABEL[p.section]} · #
										{p.sequence}
									</PhotoLabel>
								</PhotoTile>
							))}
						</PhotoGrid>
					)}
				</Section>

				<Side>
					<Section>
						<Eyebrow $gold style={{ marginBottom: 12 }}>
							Sections
						</Eyebrow>
						<SectionList>
							{SECTIONS.map((s) => (
								<SectionRow
									key={s}
									$on={
										currentSection
											?.toLowerCase()
											.includes(s) ?? false
									}
								>
									<span>{SECTION_LABEL[s]}</span>
									<span>{counts[s] ?? 0} photos</span>
								</SectionRow>
							))}
						</SectionList>
					</Section>

					<Section>
						<Eyebrow $gold style={{ marginBottom: 12 }}>
							Inspector
						</Eyebrow>
						<div style={{ fontSize: 14 }}>Assigned inspector</div>
						<div
							style={{
								color: "var(--ink-muted)",
								fontSize: 12,
								marginTop: 4,
							}}
						>
							{elapsedSince(ins?.startedAt)}
						</div>
					</Section>
				</Side>
			</Grid>
		</PageShell>
	);
}
