"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import styled, { css } from "styled-components";
import Icon, { type IconName } from "../Icon";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface IProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
	variant?: Variant;
	size?: Size;
	icon?: IconName;
	iconRight?: IconName;
	fullWidth?: boolean;
	children?: ReactNode;
	style?: CSSProperties;
}

const variantStyles = {
	primary: css`
        background: linear-gradient(180deg, var(--gold-bright), var(--gold));
        color: #1A1813;
        border-color: var(--gold-deep);
        box-shadow: 0 1px 0 rgba(255, 240, 200, 0.4) inset,
            0 4px 14px rgba(201, 169, 97, 0.25);
        &:hover {
            transform: translateY(-1px);
            box-shadow: 0 1px 0 rgba(255, 240, 200, 0.5) inset,
                0 8px 20px rgba(201, 169, 97, 0.35);
        }
    `,
	secondary: css`
        background: transparent;
        color: var(--ink);
        border-color: var(--hairline-strong);
        &:hover {
            border-color: var(--gold);
            color: var(--gold-bright);
            background: var(--gold-wash);
        }
    `,
	ghost: css`
        background: transparent;
        color: var(--ink-soft);
        border-color: transparent;
        &:hover {
            color: var(--ink);
            background: var(--surface-2);
        }
    `,
};

const sizeStyles = {
	sm: css`
        padding: 8px 14px;
        font-size: 13px;
    `,
	md: css`
        padding: 12px 22px;
        font-size: 14px;
    `,
	lg: css`
        padding: 16px 28px;
        font-size: 15px;
    `,
};

const StyledButton = styled.button<{
	$variant: Variant;
	$size: Size;
	$fullWidth: boolean;
}>`
    font-family: var(--sans);
    font-weight: 500;
    border-radius: var(--r-pill);
    display: inline-flex;
    align-items: center;
    justify-content: ${(p) => (p.$fullWidth ? "center" : "flex-start")};
    gap: 8px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    line-height: 1;
    width: ${(p) => (p.$fullWidth ? "100%" : "auto")};

    ${(p) => sizeStyles[p.$size]}
    ${(p) => variantStyles[p.$variant]}

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none !important;
    }
`;

export default function Button({
	variant = "primary",
	size = "md",
	icon,
	iconRight,
	fullWidth = false,
	children,
	type = "button",
	...rest
}: IProps) {
	return (
		<StyledButton
			$variant={variant}
			$size={size}
			$fullWidth={fullWidth}
			type={type}
			{...rest}
		>
			{icon && <Icon name={icon} size={16} />}
			{children}
			{iconRight && <Icon name={iconRight} size={16} />}
		</StyledButton>
	);
}
