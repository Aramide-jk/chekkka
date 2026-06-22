"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import useSWR from "swr";
import { Button, Card, Eyebrow, Pill } from "@/components";
import { api, fetcher, getErrorMessage, NAIRA } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

// Mirror of `ISiteConfigData` on the server. Kept structural so this client
// file can stay free of server-only imports.
interface ISiteConfig {
	general: {
		maintenanceMode: boolean;
		signupEnabled: boolean;
		bookingEnabled: boolean;
		inspectorApplicationsOpen: boolean;
		consultantChatEnabled: boolean;
	};
	pricing: {
		standardInspectionPrice: number;
		premiumInspectionPrice: number;
		platformFee: number;
		inspectorPayoutPercent: number;
	};
	inspections: {
		minPhotos: number;
		acceptWindowMinutes: number;
		sellerContactWindowHours: number;
		reportDeadlineHours: number;
		disputeAutoEscalateHours: number;
	};
	rateLimit: {
		enabled: boolean;
		windowMs: number;
		maxRequests: number;
		killSwitch: boolean;
	};
	audit: {
		adminAuditEnabled: boolean;
		userAuditEnabled: boolean;
		adminRetentionDays: number;
		userRetentionDays: number;
	};
}

type SectionKey = keyof ISiteConfig;

const Grid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const Section = styled(Card)`padding: 24px;`;
const SectionHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
`;
const SectionTitle = styled.h2`
    font-family: var(--display);
    font-size: 22px;
    margin: 0;
`;
const FieldRow = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid var(--hairline);
    &:last-of-type { border-bottom: none; }
`;
const FieldLabel = styled.div`
    font-size: 13px;
    color: var(--ink-soft);
`;
const FieldHint = styled.div`
    font-size: 11px;
    color: var(--ink-muted);
    margin-top: 4px;
`;
const Input = styled.input`
    width: 140px;
    padding: 8px 12px;
    background: var(--surface-2);
    border: 1px solid var(--hairline);
    border-radius: var(--r-sm);
    color: var(--ink);
    font-size: 13px;
    text-align: right;
    &:focus { outline: none; border-color: var(--gold); }
`;

// Tiny iOS-style toggle so the page reads as a switchboard, not a form.
const ToggleBase = styled.button<{ $on: boolean }>`
    width: 44px;
    height: 24px;
    border-radius: 999px;
    border: 1px solid
        ${(p) => (p.$on ? "var(--gold-deep)" : "var(--hairline-strong)")};
    background: ${(p) =>
		p.$on
			? "linear-gradient(180deg, var(--gold-bright), var(--gold))"
			: "var(--surface-2)"};
    position: relative;
    cursor: pointer;
    transition: all 0.15s ease;
    &::after {
        content: "";
        position: absolute;
        top: 1px;
        left: ${(p) => (p.$on ? "21px" : "1px")};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: ${(p) => (p.$on ? "#1A1813" : "var(--ink-muted)")};
        transition: all 0.15s ease;
    }
`;
const Toggle = ({
	on,
	onChange,
	testid,
}: {
	on: boolean;
	onChange: (next: boolean) => void;
	testid?: string;
}) => (
	<ToggleBase
		$on={on}
		type="button"
		role="switch"
		aria-checked={on}
		data-testid={testid}
		onClick={() => onChange(!on)}
	/>
);

const SaveBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding-top: 16px;
    margin-top: 12px;
    border-top: 1px solid var(--hairline);
`;
const SaveStatus = styled.div`
    font-size: 12px;
    color: var(--ink-muted);
`;
const ErrorText = styled.div`
    font-size: 12px;
    color: var(--danger);
`;

interface ISectionProps<K extends SectionKey> {
	sectionKey: K;
	title: string;
	subtitle: string;
	testid: string;
	values: ISiteConfig[K];
	original: ISiteConfig[K];
	dirty: boolean;
	saving: boolean;
	error: string | null;
	saved: boolean;
	onPatch: (patch: Partial<ISiteConfig[K]>) => void;
	onSave: () => Promise<void>;
	onReset: () => void;
	children: React.ReactNode;
}

function SettingsSection<K extends SectionKey>(props: ISectionProps<K>) {
	const {
		title,
		subtitle,
		testid,
		dirty,
		saving,
		error,
		saved,
		onSave,
		onReset,
		children,
	} = props;
	return (
		<Section data-testid={testid}>
			<SectionHead>
				<div>
					<Eyebrow $gold style={{ marginBottom: 4 }}>
						Settings
					</Eyebrow>
					<SectionTitle>{title}</SectionTitle>
					<FieldHint style={{ marginTop: 6 }}>{subtitle}</FieldHint>
				</div>
				{dirty && (
					<Pill tone="caution" dot>
						Unsaved
					</Pill>
				)}
				{!dirty && saved && <Pill tone="good">Saved</Pill>}
			</SectionHead>
			{children}
			<SaveBar>
				{error ? (
					<ErrorText>{error}</ErrorText>
				) : (
					<SaveStatus>
						{dirty
							? "Changes are local — click Save to apply."
							: "Up to date."}
					</SaveStatus>
				)}
				<div style={{ display: "flex", gap: 10 }}>
					{dirty && (
						<Button variant="ghost" size="sm" onClick={onReset}>
							Reset
						</Button>
					)}
					<Button
						variant="primary"
						size="sm"
						disabled={!dirty || saving}
						onClick={onSave}
						data-testid={`${testid}-save`}
					>
						{saving ? "Saving…" : "Save"}
					</Button>
				</div>
			</SaveBar>
		</Section>
	);
}

function NumberField({
	label,
	hint,
	value,
	min,
	max,
	step,
	suffix,
	testid,
	onChange,
}: {
	label: string;
	hint?: string;
	value: number;
	min?: number;
	max?: number;
	step?: number;
	suffix?: string;
	testid: string;
	onChange: (next: number) => void;
}) {
	return (
		<FieldRow>
			<div>
				<FieldLabel>{label}</FieldLabel>
				{hint && <FieldHint>{hint}</FieldHint>}
			</div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
				}}
			>
				<Input
					type="number"
					value={value}
					min={min}
					max={max}
					step={step}
					data-testid={testid}
					onChange={(e) => {
						const next = Number(e.target.value);
						if (!Number.isFinite(next)) return;
						onChange(next);
					}}
				/>
				{suffix && (
					<span
						style={{
							color: "var(--ink-muted)",
							fontSize: 12,
							minWidth: 28,
						}}
					>
						{suffix}
					</span>
				)}
			</div>
		</FieldRow>
	);
}

function BoolField({
	label,
	hint,
	on,
	testid,
	onToggle,
}: {
	label: string;
	hint?: string;
	on: boolean;
	testid: string;
	onToggle: (next: boolean) => void;
}) {
	return (
		<FieldRow>
			<div>
				<FieldLabel>{label}</FieldLabel>
				{hint && <FieldHint>{hint}</FieldHint>}
			</div>
			<Toggle on={on} onChange={onToggle} testid={testid} />
		</FieldRow>
	);
}

// ─────────────────────────────────────────────────────────────────────────────

function useSectionState<K extends SectionKey>(
	sectionKey: K,
	config: ISiteConfig | undefined,
	refresh: () => void,
) {
	const original = config?.[sectionKey];
	const [draft, setDraft] = useState<ISiteConfig[K] | undefined>(original);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		if (original) setDraft(original);
	}, [original]);

	const dirty = useMemo(() => {
		if (!original || !draft) return false;
		return JSON.stringify(original) !== JSON.stringify(draft);
	}, [original, draft]);

	async function save() {
		if (!draft) return;
		setSaving(true);
		setError(null);
		try {
			await api().patch("/api/admin/site-config", {
				[sectionKey]: draft,
			});
			setSaved(true);
			setTimeout(() => setSaved(false), 2500);
			refresh();
		} catch (err) {
			setError(getErrorMessage(err, "Could not save"));
		} finally {
			setSaving(false);
		}
	}

	function reset() {
		if (original) setDraft(original);
		setError(null);
	}

	function patch(p: Partial<ISiteConfig[K]>) {
		setDraft((d) => (d ? ({ ...d, ...p } as ISiteConfig[K]) : d));
	}

	return {
		draft,
		original,
		dirty,
		saving,
		error,
		saved,
		save,
		reset,
		patch,
	};
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsWrapper() {
	const { data, mutate } = useSWR<IResponseEnvelope<{ config: ISiteConfig }>>(
		"/api/admin/site-config",
		fetcher,
		{ revalidateOnMount: true },
	);
	const config = data?.data?.config;
	const refresh = () => {
		mutate();
	};

	const general = useSectionState("general", config, refresh);
	const pricing = useSectionState("pricing", config, refresh);
	const inspections = useSectionState("inspections", config, refresh);
	const rateLimit = useSectionState("rateLimit", config, refresh);
	const audit = useSectionState("audit", config, refresh);

	if (!config) {
		return (
			<PageShell
				eyebrow="Admin"
				title="Site"
				titleEm="settings"
				navTitle="Settings"
				subtitle="Loading current configuration…"
			>
				<Section data-testid="settings-loading">
					<FieldLabel>Loading…</FieldLabel>
				</Section>
			</PageShell>
		);
	}

	const maintenancePill = (
		<Pill
			tone={config.general.maintenanceMode ? "danger" : "good"}
			dot={config.general.maintenanceMode}
		>
			{config.general.maintenanceMode ? "Maintenance ON" : "Live"}
		</Pill>
	);

	return (
		<PageShell
			eyebrow="Admin · Configuration"
			title="Site"
			titleEm="settings"
			navTitle="Settings"
			subtitle="Pricing, kill switches, retention policies — the runtime knobs that drive the rest of the platform."
			right={maintenancePill}
		>
			<div data-testid="settings-page" style={{ marginBottom: 20 }}>
				<Pill tone="ghost">
					Resolved live · in-process cached for 10 s
				</Pill>
			</div>

			<Grid>
				{general.draft && (
					<SettingsSection
						sectionKey="general"
						testid="settings-general"
						title="General"
						subtitle="Site-wide kill switches. Maintenance mode keeps admins in and everyone else out."
						values={general.draft}
						original={general.original ?? config.general}
						dirty={general.dirty}
						saving={general.saving}
						error={general.error}
						saved={general.saved}
						onPatch={general.patch}
						onSave={general.save}
						onReset={general.reset}
					>
						<BoolField
							label="Maintenance mode"
							hint="When ON, non-admin sessions land on the maintenance page."
							on={general.draft.maintenanceMode}
							testid="toggle-maintenance"
							onToggle={(v) =>
								general.patch({ maintenanceMode: v })
							}
						/>
						<BoolField
							label="New signups"
							hint="Allow new buyer/inspector accounts to register."
							on={general.draft.signupEnabled}
							testid="toggle-signup"
							onToggle={(v) =>
								general.patch({ signupEnabled: v })
							}
						/>
						<BoolField
							label="Booking enabled"
							hint="When OFF, /book returns to a banner explaining the pause."
							on={general.draft.bookingEnabled}
							testid="toggle-booking"
							onToggle={(v) =>
								general.patch({ bookingEnabled: v })
							}
						/>
						<BoolField
							label="Inspector applications"
							hint="Accept new inspector applications via /inspector/apply."
							on={general.draft.inspectorApplicationsOpen}
							testid="toggle-inspector-applications"
							onToggle={(v) =>
								general.patch({
									inspectorApplicationsOpen: v,
								})
							}
						/>
						<BoolField
							label="Consultant chat"
							hint="Pre-booking consultant guidance via /chat."
							on={general.draft.consultantChatEnabled}
							testid="toggle-consultant"
							onToggle={(v) =>
								general.patch({
									consultantChatEnabled: v,
								})
							}
						/>
					</SettingsSection>
				)}

				{pricing.draft && (
					<SettingsSection
						sectionKey="pricing"
						testid="settings-pricing"
						title="Pricing & fees"
						subtitle="Inspection prices, platform take, and inspector payout split."
						values={pricing.draft}
						original={pricing.original ?? config.pricing}
						dirty={pricing.dirty}
						saving={pricing.saving}
						error={pricing.error}
						saved={pricing.saved}
						onPatch={pricing.patch}
						onSave={pricing.save}
						onReset={pricing.reset}
					>
						<NumberField
							label="Standard inspection"
							hint={`Currently ${NAIRA(
								pricing.draft.standardInspectionPrice,
							)}`}
							value={pricing.draft.standardInspectionPrice}
							min={0}
							step={500}
							suffix="₦"
							testid="field-standard-price"
							onChange={(v) =>
								pricing.patch({
									standardInspectionPrice: v,
								})
							}
						/>
						<NumberField
							label="Premium inspection"
							hint={`Currently ${NAIRA(
								pricing.draft.premiumInspectionPrice,
							)}`}
							value={pricing.draft.premiumInspectionPrice}
							min={0}
							step={500}
							suffix="₦"
							testid="field-premium-price"
							onChange={(v) =>
								pricing.patch({
									premiumInspectionPrice: v,
								})
							}
						/>
						<NumberField
							label="Platform fee"
							hint={`Added on every booking · ${NAIRA(
								pricing.draft.platformFee,
							)}`}
							value={pricing.draft.platformFee}
							min={0}
							step={100}
							suffix="₦"
							testid="field-platform-fee"
							onChange={(v) => pricing.patch({ platformFee: v })}
						/>
						<NumberField
							label="Inspector payout"
							hint="Percentage of inspection price paid to the inspector."
							value={pricing.draft.inspectorPayoutPercent}
							min={0}
							max={100}
							step={1}
							suffix="%"
							testid="field-payout-percent"
							onChange={(v) =>
								pricing.patch({
									inspectorPayoutPercent: v,
								})
							}
						/>
					</SettingsSection>
				)}

				{inspections.draft && (
					<SettingsSection
						sectionKey="inspections"
						testid="settings-inspections"
						title="Inspection rules"
						subtitle="Minimums, deadlines, and escalation windows."
						values={inspections.draft}
						original={inspections.original ?? config.inspections}
						dirty={inspections.dirty}
						saving={inspections.saving}
						error={inspections.error}
						saved={inspections.saved}
						onPatch={inspections.patch}
						onSave={inspections.save}
						onReset={inspections.reset}
					>
						<NumberField
							label="Minimum photos"
							hint="Inspector cannot submit a report below this count."
							value={inspections.draft.minPhotos}
							min={1}
							max={500}
							step={1}
							testid="field-min-photos"
							onChange={(v) =>
								inspections.patch({ minPhotos: v })
							}
						/>
						<NumberField
							label="Accept window"
							hint="Time the inspector has to accept a new job."
							value={inspections.draft.acceptWindowMinutes}
							min={1}
							step={1}
							suffix="min"
							testid="field-accept-window"
							onChange={(v) =>
								inspections.patch({
									acceptWindowMinutes: v,
								})
							}
						/>
						<NumberField
							label="Seller contact window"
							hint="Hours to confirm contact with the seller after accepting."
							value={inspections.draft.sellerContactWindowHours}
							min={1}
							step={1}
							suffix="h"
							testid="field-seller-window"
							onChange={(v) =>
								inspections.patch({
									sellerContactWindowHours: v,
								})
							}
						/>
						<NumberField
							label="Report deadline"
							hint="Hours after the on-site visit to file the report."
							value={inspections.draft.reportDeadlineHours}
							min={1}
							step={1}
							suffix="h"
							testid="field-report-deadline"
							onChange={(v) =>
								inspections.patch({
									reportDeadlineHours: v,
								})
							}
						/>
						<NumberField
							label="Dispute auto-escalate"
							hint="Open disputes are auto-escalated to senior admins after this delay."
							value={inspections.draft.disputeAutoEscalateHours}
							min={1}
							step={1}
							suffix="h"
							testid="field-dispute-escalate"
							onChange={(v) =>
								inspections.patch({
									disputeAutoEscalateHours: v,
								})
							}
						/>
					</SettingsSection>
				)}

				{rateLimit.draft && (
					<SettingsSection
						sectionKey="rateLimit"
						testid="settings-rate-limit"
						title="Rate limiting"
						subtitle="The Redis-backed global limiter. Kill switch bypasses the limiter entirely."
						values={rateLimit.draft}
						original={rateLimit.original ?? config.rateLimit}
						dirty={rateLimit.dirty}
						saving={rateLimit.saving}
						error={rateLimit.error}
						saved={rateLimit.saved}
						onPatch={rateLimit.patch}
						onSave={rateLimit.save}
						onReset={rateLimit.reset}
					>
						<BoolField
							label="Enabled"
							hint="Master switch for the per-IP rate limiter."
							on={rateLimit.draft.enabled}
							testid="toggle-rate-limit"
							onToggle={(v) => rateLimit.patch({ enabled: v })}
						/>
						<BoolField
							label="Kill switch (bypass)"
							hint="Set ON to skip the limiter for every request. Use sparingly."
							on={rateLimit.draft.killSwitch}
							testid="toggle-rate-limit-kill"
							onToggle={(v) => rateLimit.patch({ killSwitch: v })}
						/>
						<NumberField
							label="Window"
							hint="Length of each rate-limit bucket."
							value={rateLimit.draft.windowMs}
							min={1_000}
							step={1_000}
							suffix="ms"
							testid="field-rate-window"
							onChange={(v) => rateLimit.patch({ windowMs: v })}
						/>
						<NumberField
							label="Max requests / window"
							hint="Per IP per window before 429s start."
							value={rateLimit.draft.maxRequests}
							min={1}
							step={10}
							testid="field-rate-max"
							onChange={(v) =>
								rateLimit.patch({ maxRequests: v })
							}
						/>
					</SettingsSection>
				)}

				{audit.draft && (
					<SettingsSection
						sectionKey="audit"
						testid="settings-audit"
						title="Audit & logging"
						subtitle="Admin and user audit streams + retention windows. Mirrors the gkoi audit pattern."
						values={audit.draft}
						original={audit.original ?? config.audit}
						dirty={audit.dirty}
						saving={audit.saving}
						error={audit.error}
						saved={audit.saved}
						onPatch={audit.patch}
						onSave={audit.save}
						onReset={audit.reset}
					>
						<BoolField
							label="Admin audit log"
							hint="Record every admin mutation to adminauditlogs."
							on={audit.draft.adminAuditEnabled}
							testid="toggle-admin-audit"
							onToggle={(v) =>
								audit.patch({ adminAuditEnabled: v })
							}
						/>
						<BoolField
							label="User audit log"
							hint="Record buyer/inspector activity (logins, bookings, uploads)."
							on={audit.draft.userAuditEnabled}
							testid="toggle-user-audit"
							onToggle={(v) =>
								audit.patch({ userAuditEnabled: v })
							}
						/>
						<NumberField
							label="Admin retention"
							hint="Days before admin audit rows TTL-expire."
							value={audit.draft.adminRetentionDays}
							min={1}
							max={3650}
							step={1}
							suffix="d"
							testid="field-admin-retention"
							onChange={(v) =>
								audit.patch({ adminRetentionDays: v })
							}
						/>
						<NumberField
							label="User retention"
							hint="Days before user audit rows TTL-expire."
							value={audit.draft.userRetentionDays}
							min={1}
							max={3650}
							step={1}
							suffix="d"
							testid="field-user-retention"
							onChange={(v) =>
								audit.patch({ userRetentionDays: v })
							}
						/>
					</SettingsSection>
				)}
			</Grid>
		</PageShell>
	);
}
