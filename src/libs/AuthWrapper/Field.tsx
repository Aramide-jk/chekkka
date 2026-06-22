"use client";

import type { InputHTMLAttributes } from "react";
import styled from "styled-components";

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
	label: string;
	hint?: string;
}

const Wrap = styled.label`
    display: block;
    margin-bottom: 18px;
`;

const LabelRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
`;

const Label = styled.span`
    font-size: 12px;
    color: var(--ink-soft);
    letter-spacing: 0.04em;
`;

const Hint = styled.span`
    font-size: 11px;
    color: var(--ink-muted);
`;

const Input = styled.input`
    width: 100%;
    padding: 14px 16px;
    background: var(--surface);
    border: 1px solid var(--hairline-strong);
    border-radius: var(--r-sm);
    color: var(--ink);
    font-size: 14px;
    transition: border-color 0.15s ease, background 0.15s ease;

    &::placeholder {
        color: var(--ink-faint);
    }

    &:focus {
        border-color: var(--gold);
        background: var(--surface-2);
    }
`;

export default function Field({ label, hint, ...rest }: IProps) {
	return (
		<Wrap>
			<LabelRow>
				<Label>{label}</Label>
				{hint && <Hint>{hint}</Hint>}
			</LabelRow>
			<Input {...rest} />
		</Wrap>
	);
}
