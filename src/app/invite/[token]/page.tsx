import InviteWrapper from "@/libs/InviteWrapper";

export const metadata = { title: "Accept your invite · Chekka" };

export default async function InvitePage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	return <InviteWrapper token={token} />;
}
