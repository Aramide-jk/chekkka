import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CLOUDFRONT_CDN_URL, S3_BUCKET } from "../../constants";
import getS3Instance from "./getS3Instance";

/**
 * Resolve a stored S3 key to a viewer-ready URL.
 *
 * Resolution order:
 *  - Empty           → `""`.
 *  - `mock://` key    → in-app mock-asset proxy (local dev, no S3).
 *  - Absolute `http`  → returned untouched (already a usable URL).
 *  - CloudFront set   → CDN URL.
 *  - Otherwise        → a **presigned** S3 GET URL. There is no CDN at the
 *                       moment, so this is the live path.
 *
 * `expiresInSeconds` should be the lifetime of the data currently being
 * processed — i.e. the cache TTL of the payload that carries this link — so the
 * presigned URL stays valid for exactly as long as that payload is considered
 * fresh. The link is minted on every call (never cached) so each response
 * reflects the current data's expiration window.
 *
 * @returns the resolved URL, or the original `fileName` when S3 is unconfigured.
 */
export default async function s3GetFileLink({
	fileName,
	expiresInSeconds = 60 * 60,
}: {
	fileName: string;
	expiresInSeconds?: number;
}): Promise<string> {
	if (!fileName) return "";
	if (fileName.startsWith("mock://")) {
		return `/api/mock-asset?key=${encodeURIComponent(fileName.replace("mock://", ""))}`;
	}
	if (fileName.startsWith("http")) return fileName;

	if (CLOUDFRONT_CDN_URL) return `${CLOUDFRONT_CDN_URL}/${fileName}`;

	const client = getS3Instance();
	if (!client) return fileName;

	return getSignedUrl(
		client,
		new GetObjectCommand({ Bucket: S3_BUCKET, Key: fileName }),
		{ expiresIn: expiresInSeconds },
	);
}
