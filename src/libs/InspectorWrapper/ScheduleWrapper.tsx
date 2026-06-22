"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import useSWR, { mutate } from "swr";
import { Button, Card, Eyebrow } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABEL: Record<(typeof DAYS)[number], string> = {
	mon: "Mon",
	tue: "Tue",
	wed: "Wed",
	thu: "Thu",
	fri: "Fri",
	sat: "Sat",
	sun: "Sun",
};
const SLOTS = ["09:00", "11:00", "14:00", "16:00"] as const;

interface IProfile {
	schedule: {
		weekly: Record<
			string,
			{ active: boolean; slots: Array<{ time: string; on: boolean }> }
		>;
		blockedDates: string[];
	};
}

function defaultWeekly() {
	const out: IProfile["schedule"]["weekly"] = {};
	for (const d of DAYS) {
		out[d] = {
			active: d !== "sun",
			slots: SLOTS.map((time) => ({ time, on: true })),
		};
	}
	return out;
}

const Grid = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const Section = styled(Card)`padding: 24px;`;
const DayGrid = styled.div`
    display: grid;
    grid-template-columns: 100px repeat(4, 1fr);
    gap: 8px;
    align-items: center;
`;
const SlotBtn = styled.button<{ $on: boolean }>`
    padding: 12px;
    border-radius: var(--r-sm);
    background: ${(p) => (p.$on ? "var(--gold-wash)" : "var(--surface-2)")};
    border: 1px solid ${(p) => (p.$on ? "var(--gold)" : "var(--hairline)")};
    color: ${(p) => (p.$on ? "var(--gold-bright)" : "var(--ink-soft)")};
    cursor: pointer;
    font-size: 13px;
`;
const DayLabel = styled.div`color: var(--ink-soft); font-size: 13px;`;
const Saved = styled.div`
    margin-top: 14px;
    color: var(--good);
    font-size: 13px;
`;
const ErrorBox = styled.div`
    margin-top: 14px;
    padding: 8px 12px;
    background: var(--danger-wash);
    border: 1px solid var(--danger-deep);
    border-radius: var(--r-sm);
    color: var(--danger);
    font-size: 13px;
`;

export default function ScheduleWrapper() {
	const { data } = useSWR<IResponseEnvelope<{ profile: IProfile | null }>>(
		"/api/inspector-profiles/me",
		fetcher,
		{ revalidateOnMount: true },
	);
	const profile = data?.data?.profile;
	const [weekly, setWeekly] = useState<IProfile["schedule"]["weekly"]>(() =>
		defaultWeekly(),
	);
	const [savedAt, setSavedAt] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (profile?.schedule?.weekly) {
			const fromServer = profile.schedule
				.weekly as IProfile["schedule"]["weekly"];
			const merged = defaultWeekly();
			for (const d of DAYS) {
				if (fromServer[d]) merged[d] = fromServer[d];
			}
			setWeekly(merged);
		}
	}, [profile]);

	function isOn(d: (typeof DAYS)[number], time: string) {
		return !!weekly[d]?.slots.find((s) => s.time === time)?.on;
	}

	async function toggle(day: (typeof DAYS)[number], time: string) {
		const next = JSON.parse(
			JSON.stringify(weekly),
		) as IProfile["schedule"]["weekly"];
		const slot = next[day].slots.find((s) => s.time === time);
		if (slot) slot.on = !slot.on;
		setWeekly(next);
		try {
			await api().patch("/api/inspector-profiles/schedule", {
				weekly: next,
			});
			setSavedAt(Date.now());
			setError(null);
			mutate("/api/inspector-profiles/me");
		} catch (err) {
			setError(getErrorMessage(err, "Could not save schedule"));
		}
	}

	const savedRecent = useMemo(
		() => !!savedAt && Date.now() - savedAt < 4000,
		[savedAt],
	);

	return (
		<PageShell
			eyebrow="Schedule"
			title="Your weekly"
			titleEm="availability"
			navTitle="Schedule"
			subtitle="Toggle the slots you can be reached. Buyers only see what's on."
		>
			<Grid>
				<Section data-testid="schedule-grid">
					<Eyebrow $gold style={{ marginBottom: 16 }}>
						Weekly recurring
					</Eyebrow>
					<DayGrid>
						<div></div>
						{SLOTS.map((s) => (
							<DayLabel key={s} style={{ textAlign: "center" }}>
								{s}
							</DayLabel>
						))}
						{DAYS.map((d) => (
							<Fragment key={d}>
								<DayLabel>{DAY_LABEL[d]}</DayLabel>
								{SLOTS.map((s) => (
									<SlotBtn
										key={`${d}-${s}`}
										$on={isOn(d, s)}
										onClick={() => toggle(d, s)}
										type="button"
									>
										{isOn(d, s) ? "On" : "Off"}
									</SlotBtn>
								))}
							</Fragment>
						))}
					</DayGrid>
					{savedRecent && <Saved>Saved</Saved>}
					{error && <ErrorBox>{error}</ErrorBox>}
				</Section>

				<Section>
					<Eyebrow $gold style={{ marginBottom: 14 }}>
						Blocked dates
					</Eyebrow>
					<div style={{ color: "var(--ink-muted)", fontSize: 13 }}>
						Block specific dates from the calendar above. Coming
						soon.
					</div>
					<div style={{ marginTop: 14 }}>
						<Button
							variant="secondary"
							size="sm"
							icon="plus"
							fullWidth
							disabled
						>
							Add blocked date
						</Button>
					</div>
				</Section>
			</Grid>
		</PageShell>
	);
}
