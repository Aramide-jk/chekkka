import { AdminQueueWrapper } from "@/libs/AdminWrapper";

export const metadata = { title: "Admin · Special requests" };

export default function AdminSpecialRequestsPage() {
	return <AdminQueueWrapper kind="special-requests" />;
}
