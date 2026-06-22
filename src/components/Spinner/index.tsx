"use client";

import styled from "styled-components";

const Spin = styled.span<{ $size: number }>`
    width: ${(p) => p.$size}px;
    height: ${(p) => p.$size}px;
    border-radius: 50%;
    border: 2px solid var(--gold-wash-2);
    border-top-color: var(--gold);
    display: inline-block;
    animation: spin 0.8s linear infinite;
`;

export default function Spinner({ size = 14 }: { size?: number }) {
	return <Spin $size={size} />;
}
