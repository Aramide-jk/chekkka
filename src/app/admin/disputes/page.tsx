import { AdminQueueWrapper } from "@/libs/AdminWrapper";

export const metadata = { title: "Admin · Disputes" };

export default function AdminDisputesPage() {
	return <AdminQueueWrapper kind="disputes" />;
}
