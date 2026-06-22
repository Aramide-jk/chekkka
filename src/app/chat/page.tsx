import ChatWrapper from "@/libs/ChatWrapper";

export const metadata = { title: "Chat · Chekka" };

export default async function ChatPage({
	searchParams,
}: {
	searchParams: Promise<{ context?: string }>;
}) {
	const { context } = await searchParams;
	return <ChatWrapper context={context} />;
}
