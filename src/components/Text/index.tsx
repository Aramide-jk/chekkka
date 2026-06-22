"use client";

import styled, { css } from "styled-components";

interface IProps {
	$family?: "display" | "sans" | "mono";
	$size?: string;
	$weight?: number | string;
	$color?: string;
	$lineHeight?: string;
	$letterSpacing?: string;
	$italic?: boolean;
	$align?: string;
	$transform?: string;
}

const base = css<IProps>`
    font-family: ${(p) =>
		p.$family === "display"
			? "var(--display)"
			: p.$family === "mono"
				? "var(--mono)"
				: "var(--sans)"};
    ${(p) => p.$size && `font-size: ${p.$size};`}
    ${(p) => p.$weight && `font-weight: ${p.$weight};`}
    ${(p) => p.$color && `color: ${p.$color};`}
    ${(p) => p.$lineHeight && `line-height: ${p.$lineHeight};`}
    ${(p) => p.$letterSpacing && `letter-spacing: ${p.$letterSpacing};`}
    ${(p) => p.$italic && `font-style: italic;`}
    ${(p) => p.$align && `text-align: ${p.$align};`}
    ${(p) => p.$transform && `text-transform: ${p.$transform};`}
`;

export const Text = styled.span<IProps>`
	${base}
`;
export const TextP = styled.p<IProps>`
	${base}
`;
export const TextH1 = styled.h1<IProps>`
	${base}
`;
export const TextH2 = styled.h2<IProps>`
	${base}
`;
export const TextH3 = styled.h3<IProps>`
	${base}
`;

export const Eyebrow = styled.div<{ $gold?: boolean }>`
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${(p) => (p.$gold ? "var(--gold)" : "var(--ink-muted)")};
`;

export default Text;
