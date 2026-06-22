import { StatusWrapper } from "@/libs/InspectorWrapper";

export const metadata = { title: "Account suspended · Chekka" };

export default function InspectorSuspendedPage() {
	return <StatusWrapper status="suspended" />;
}
