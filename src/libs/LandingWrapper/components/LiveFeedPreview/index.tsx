"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Avatar, Eyebrow, Photo, type PhotoKind } from "@/components";

interface PreviewPhoto {
	tag: string;
	kind: PhotoKind;
	note: string;
	time: string;
}

const PHOTOS: PreviewPhoto[] = [
	{
		tag: "Engine bay",
		kind: "engine",
		note: "Engine bay is clean. No fluid leaks visible. Will check oil level next.",
		time: "2:38 PM",
	},
	{
		tag: "Dashboard",
		kind: "dash",
		note: "Dashboard powers on. No active warning lights. Mileage matches listing.",
		time: "2:24 PM",
	},
	{
		tag: "Driver side",
		kind: "car",
		note: "Front quarter panel — paint matches surrounding panels. No repair signs.",
		time: "2:14 PM",
	},
	{
		tag: "Tyre · front R",
		kind: "tire",
		note: "Tyre tread depth 6mm. Within wear limit. No bulges or cracks.",
		time: "2:17 PM",
	},
];

const Wrap = styled.div`
    padding: 24px;
    background: linear-gradient(180deg, var(--surface-2), var(--bg-tint));
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    box-shadow: var(--shadow-2);
    transform: rotate(0.3deg);
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

const Dot = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--gold-bright);
    display: inline-block;
    animation: pulse 1.4s ease-in-out infinite;
`;

const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 18px 0 16px;
`;

const NoteCard = styled.div`
    padding: 14px;
    background: var(--surface);
    border-radius: 12px;
    border: 1px solid var(--hairline);
`;

const Mono = styled.span`
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    color: var(--ink-muted);
    font-size: 11px;
`;

export default function LiveFeedPreview() {
	const [photoIdx, setPhotoIdx] = useState(3);

	useEffect(() => {
		const t = setInterval(() => {
			setPhotoIdx((p) => (p + 1) % PHOTOS.length);
		}, 2200);
		return () => clearInterval(t);
	}, []);

	const current = PHOTOS[photoIdx];

	return (
		<Wrap>
			<Row>
				<Row style={{ gap: 10 }}>
					<Dot />
					<Eyebrow $gold>Live · Inspection in progress</Eyebrow>
				</Row>
				<Mono>CHK-2026-0429</Mono>
			</Row>

			<PhotoGrid>
				{PHOTOS.map((p, i) => (
					<Photo
						key={p.tag}
						tag={p.tag}
						kind={p.kind}
						lit={i === photoIdx}
						ratio="4/3"
					/>
				))}
			</PhotoGrid>

			<NoteCard>
				<Row style={{ marginBottom: 8 }}>
					<Eyebrow>Inspector note · {current.time}</Eyebrow>
					<span style={{ fontSize: 11, color: "var(--gold)" }}>
						Tunde B.
					</span>
				</Row>
				<p
					style={{
						fontSize: 13,
						color: "var(--ink-soft)",
						lineHeight: 1.5,
					}}
				>
					{current.note}
				</p>
			</NoteCard>

			<Row style={{ marginTop: 14 }}>
				<Avatar name="TB" size={32} />
				<div style={{ flex: 1, marginLeft: 12 }}>
					<div style={{ fontSize: 13 }}>Tunde Bakare</div>
					<div
						style={{
							fontSize: 11,
							color: "var(--ink-muted)",
						}}
					>
						Currently examining · Engine
					</div>
				</div>
				<Mono style={{ color: "var(--gold)" }}>23 photos</Mono>
			</Row>
		</Wrap>
	);
}
