import { JobDetailWrapper } from "@/libs/InspectorWrapper";
import { getSiteConfig } from "@/server/services/siteConfigs";

export const metadata = { title: "Job · Chekka" };

export default async function InspectorJobPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	// Fetch the runtime config server-side and pass the slice the wrapper
	// needs as props. The config is dual-layer cached + falls back to
	// SITE_CONFIG_DEFAULTS, so this stays cheap.
	const config = await getSiteConfig();
	return (
		<JobDetailWrapper
			id={id}
			acceptWindowMinutes={config.inspections.acceptWindowMinutes}
			sellerContactWindowHours={
				config.inspections.sellerContactWindowHours
			}
			reportDeadlineHours={config.inspections.reportDeadlineHours}
			inspectorPayoutPercent={config.pricing.inspectorPayoutPercent}
		/>
	);
}
