"use client";

import type { HTMLAttributes, ReactNode } from "react";
import styled from "styled-components";

export type PillTone =
	| "gold"
	| "good"
	| "caution"
	| "danger"
	| "info"
	| "ghost";

interface IProps extends HTMLAttributes<HTMLSpanElement> {
	tone?: PillTone;
	dot?: boolean;
	children?: ReactNode;
}

const Wrap = styled.span<{ $tone: PillTone }>`
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-radius: var(--r-pill);
    padding: 5px 11px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid;
    white-space: nowrap;

    ${(p) => {
		switch (p.$tone) {
			case "gold":
				return `background: var(--gold-wash); color: var(--gold-bright); border-color: var(--gold-wash-2);`;
			case "good":
				return `background: var(--good-wash); color: var(--good); border-color: var(--good-deep);`;
			case "caution":
				return `background: var(--caution-wash); color: var(--caution); border-color: var(--caution-deep);`;
			case "danger":
				return `background: var(--danger-wash); color: var(--danger); border-color: var(--danger-deep);`;
			case "info":
				return `background: var(--info-wash); color: var(--info); border-color: rgba(140, 168, 196, 0.32);`;
			case "ghost":
				return `background: transparent; color: var(--ink-muted); border-color: var(--hairline);`;
		}
	}}
`;

const Dot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    display: inline-block;
    animation: pulse 1.4s ease-in-out infinite;
`;

export default function Pill({
	tone = "ghost",
	dot,
	children,
	...rest
}: IProps) {
	return (
		<Wrap $tone={tone} {...rest}>
			{dot && <Dot />}
			{children}
		</Wrap>
	);
}
