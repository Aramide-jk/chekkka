import Link from "next/link";
import { Button, Eyebrow } from "@/components";
import { PageShell } from "@/layouts";

export const metadata = { title: "Become an inspector · Chekka" };

export default function InspectorIntroPage() {
	return (
		<PageShell
			eyebrow="For inspectors"
			title="Earn for the work"
			titleEm="you already do"
			navTitle="Inspector"
			showAccount={false}
			subtitle="Set your availability, take inspections in your city, and earn a transparent payout for each job. Apply once — admin reviews in 48 h."
			right={
				<Link href="/inspector/apply">
					<Button
						variant="primary"
						size="md"
						iconRight="chevron-right"
					>
						Apply now
					</Button>
				</Link>
			}
		>
			<div
				style={{
					color: "var(--ink-soft)",
					fontSize: 14,
					lineHeight: 1.7,
					maxWidth: 720,
				}}
			>
				<Eyebrow $gold style={{ marginBottom: 12 }}>
					What you get
				</Eyebrow>
				<ul style={{ paddingLeft: 18, listStyle: "disc" }}>
					<li>
						Buyers pre-paid via Paystack — every job is funded
						before you arrive.
					</li>
					<li>
						Pick the slots you want to work; ignore everything else.
					</li>
					<li>
						Transparent payouts — released 48 h after report
						submission.
					</li>
					<li>
						Dispute resolution handled by Chekka admin, not the
						buyer.
					</li>
				</ul>
			</div>
		</PageShell>
	);
}
