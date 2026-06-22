"use client";

import styled from "styled-components";
import { Eyebrow, Icon } from "@/components";

const Wrap = styled.div`
    padding: 28px;
    background: linear-gradient(160deg, var(--surface-2), var(--surface));
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    box-shadow: var(--shadow-2);
`;

const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
`;

const Mono = styled.span`
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    color: var(--ink-muted);
    font-size: 11px;
`;

const CarTitle = styled.div`
    font-family: var(--display);
    font-size: 30px;
    margin-bottom: 4px;
`;

const CarSub = styled.div`
    color: var(--ink-muted);
    font-size: 13px;
    margin-bottom: 24px;
`;

const Summary = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    margin-bottom: 24px;
`;

const SummaryCell = styled.div<{
	$tone: "good" | "caution" | "danger";
}>`
    padding: 14px;
    border-radius: 10px;
    text-align: center;
    background: var(--${(p) => p.$tone}-wash);

    .num {
        font-family: var(--display);
        font-variant-numeric: tabular-nums;
        font-size: 32px;
        color: var(--${(p) => p.$tone});
        line-height: 1;
    }
`;

const Verdict = styled.div`
    padding: 20px 24px;
    background: var(--good-wash);
    border: 1px solid var(--good-deep);
    border-radius: 14px;
`;

const VerdictHead = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
`;

const VerdictTitle = styled.div`
    font-family: var(--display);
    font-size: 32px;
    color: var(--ink);
    margin-bottom: 6px;
`;

export default function SampleReportCard() {
	return (
		<Wrap>
			<HeaderRow>
				<Eyebrow $gold>Inspection Report · Sample</Eyebrow>
				<Mono>CHK-2026-0418</Mono>
			</HeaderRow>
			<CarTitle>Honda Accord Sport 2020</CarTitle>
			<CarSub>VIN 1HGCV1F36LA047288 · 64,200 km · Pearl White</CarSub>

			<Summary>
				<SummaryCell $tone="good">
					<div className="num">38</div>
					<Eyebrow style={{ color: "var(--good)" }}>Passed</Eyebrow>
				</SummaryCell>
				<SummaryCell $tone="caution">
					<div className="num">4</div>
					<Eyebrow style={{ color: "var(--caution)" }}>Minor</Eyebrow>
				</SummaryCell>
				<SummaryCell $tone="danger">
					<div className="num">0</div>
					<Eyebrow style={{ color: "var(--danger)" }}>
						Serious
					</Eyebrow>
				</SummaryCell>
			</Summary>

			<Verdict>
				<VerdictHead>
					<Icon
						name="check"
						size={18}
						style={{ color: "var(--good)" }}
					/>
					<Eyebrow style={{ color: "var(--good)" }}>Verdict</Eyebrow>
				</VerdictHead>
				<VerdictTitle>Worth Buying</VerdictTitle>
				<p
					style={{
						fontSize: 13,
						color: "var(--ink-soft)",
						lineHeight: 1.5,
					}}
				>
					A well-maintained 2020 Accord with no significant issues.
					Minor cosmetic items only.
				</p>
			</Verdict>
		</Wrap>
	);
}
