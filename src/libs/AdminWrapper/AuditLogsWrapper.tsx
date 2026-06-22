"use client";

import styled from "styled-components";
import useSWR from "swr";
import { Card, Eyebrow, Pill } from "@/components";
import { fetcher } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

interface IAuditLog {
	_id: string;
	actorEmail?: string;
	action: string;
	target?: string;
	before?: Record<string, unknown>;
	after?: Record<string, unknown>;
	ip?: string;
	userAgent?: string;
	createdAt: string;
}

const Section = styled(Card)`padding: 24px;`;
const Row = styled.div`
    display: grid;
    grid-template-columns: 160px 1fr 220px auto;
    align-items: flex-start;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid var(--hairline);
    font-size: 13px;
    &:last-child { border-bottom: none; }
    @media (max-width: 720px) { grid-template-columns: 1fr; }
`;
const Mono = styled.code`
    font-family: var(--mono, monospace);
    color: var(--ink-muted);
    font-size: 12px;
    word-break: break-word;
    display: block;
`;
const Empty = styled.div`
    color: var(--ink-muted);
    padding: 24px 0;
    text-align: center;
    font-size: 13px;
`;

function relTime(iso: string): string {
	const t = new Date(iso).getTime();
	const diff = Date.now() - t;
	if (diff < 60_000) return "just now";
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
	return new Date(iso).toLocaleString();
}

export default function AuditLogsWrapper() {
	const { data } = useSWR<IResponseEnvelope<{ logs: IAuditLog[] }>>(
		"/api/admin/audit-logs?limit=100",
		fetcher,
		{ revalidateOnMount: true, refreshInterval: 30_000 },
	);
	const logs = data?.data?.logs ?? [];

	return (
		<PageShell
			eyebrow="Admin · Audit"
			title="Audit"
			titleEm="trail"
			navTitle="Audit log"
			subtitle="Append-only trail of every admin mutation, TTL-expired per the audit retention setting."
			right={<Pill tone="gold">{logs.length} entries</Pill>}
		>
			<Section data-testid="audit-logs">
				<Eyebrow $gold style={{ marginBottom: 14 }}>
					Most recent
				</Eyebrow>
				{logs.length === 0 ? (
					<Empty>No admin actions recorded yet.</Empty>
				) : (
					logs.map((log) => (
						<Row key={log._id}>
							<div>
								<Pill tone="gold">{log.action}</Pill>
								<div
									style={{
										color: "var(--ink-muted)",
										fontSize: 11,
										marginTop: 6,
									}}
								>
									{relTime(log.createdAt)}
								</div>
							</div>
							<div>
								<div style={{ color: "var(--ink-soft)" }}>
									{log.actorEmail ?? "unknown actor"}
								</div>
								{log.target && (
									<div
										style={{
											color: "var(--ink-muted)",
											fontSize: 12,
											marginTop: 4,
										}}
									>
										target: {log.target}
									</div>
								)}
							</div>
							<div>
								{log.before && (
									<Mono>
										before: {JSON.stringify(log.before)}
									</Mono>
								)}
								{log.after && (
									<Mono>
										after: {JSON.stringify(log.after)}
									</Mono>
								)}
							</div>
							<Mono>{log.ip ?? "—"}</Mono>
						</Row>
					))
				)}
			</Section>
		</PageShell>
	);
}
