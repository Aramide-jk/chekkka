import { AdminQueueWrapper } from "@/libs/AdminWrapper";

export const metadata = { title: "Admin · Broker requests" };

export default function AdminBrokerRequestsPage() {
	return <AdminQueueWrapper kind="broker-requests" />;
}
