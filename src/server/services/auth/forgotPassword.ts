import "server-only";
import getUserByEmail from "../users/getUserByEmail";

/**
 * Lookup-only helper used by the forgot-password endpoint. Returns whether a
 * matching account exists; never reveals account existence to callers — the
 * route always responds with a generic acknowledgement.
 *
 * When the wider OTP / email pipeline is wired up (see Chekka_Core_Features
 * feature 11) this is the seam to generate and dispatch the reset token.
 */
export default async function forgotPassword({
	identifier,
}: {
	identifier: string;
}): Promise<{ sent: true }> {
	if (identifier.includes("@")) {
		await getUserByEmail({ email: identifier }).catch(() => null);
	}
	return { sent: true };
}
