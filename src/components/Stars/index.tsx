"use client";

import Icon from "../Icon";

interface IProps {
	rating?: number;
	size?: number;
}

export default function Stars({ rating = 5, size = 13 }: IProps) {
	const full = Math.floor(rating);
	const half = rating - full >= 0.5;
	return (
		<span style={{ display: "inline-flex", gap: 1, color: "var(--gold)" }}>
			{Array.from({ length: 5 }).map((_, i) => (
				<Icon
					key={i}
					name={
						i < full || (i === full && half)
							? "star"
							: "star-outline"
					}
					size={size}
				/>
			))}
		</span>
	);
}
