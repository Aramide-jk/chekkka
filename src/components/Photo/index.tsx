"use client";

import type { CSSProperties } from "react";
import styled from "styled-components";

export type PhotoKind = "car" | "engine" | "interior" | "tire" | "dash";

interface IProps {
	tag?: string;
	ratio?: string;
	kind?: PhotoKind;
	lit?: boolean;
	style?: CSSProperties;
}

const PALETTES: Record<PhotoKind, [string, string]> = {
	car: ["#3A352A", "#1f1c17"],
	engine: ["#4A4030", "#221d14"],
	interior: ["#3a2a1f", "#1c1410"],
	tire: ["#1e1c17", "#100e0c"],
	dash: ["#2a3a35", "#141c1a"],
};

const Wrap = styled.div<{
	$ratio: string;
	$kind: PhotoKind;
	$lit: boolean;
}>`
    aspect-ratio: ${(p) => p.$ratio};
    background:
        radial-gradient(
            circle at 30% 30%,
            ${(p) =>
				p.$lit ? "rgba(232,199,123,0.25)" : "rgba(201,169,97,0.10)"},
            transparent 60%
        ),
        linear-gradient(
            135deg,
            ${(p) => PALETTES[p.$kind][0]},
            ${(p) => PALETTES[p.$kind][1]}
        );
    border: 1px solid var(--hairline);
    border-radius: var(--r-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-faint);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    position: relative;
    overflow: hidden;

    &::after {
        content: "";
        position: absolute;
        inset: 0;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M0 100 L100 0' stroke='%23C9A961' stroke-opacity='0.06' stroke-width='0.5'/><path d='M0 50 L50 0' stroke='%23C9A961' stroke-opacity='0.06' stroke-width='0.5'/><path d='M50 100 L100 50' stroke='%23C9A961' stroke-opacity='0.06' stroke-width='0.5'/></svg>");
    }

    span {
        position: relative;
        z-index: 1;
    }
`;

export default function Photo({
	tag,
	ratio = "4/3",
	kind = "car",
	lit = false,
	style,
}: IProps) {
	return (
		<Wrap $ratio={ratio} $kind={kind} $lit={lit} style={style}>
			<span>{tag}</span>
		</Wrap>
	);
}
