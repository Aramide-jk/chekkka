import "server-only";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3_BUCKET } from "../../constants";
import getS3Instance from "./getS3Instance";

/**
 * Delete an object from S3 by key. Returns `false` (rather than throwing) when
 * S3 is unconfigured or the delete fails, so cleanup paths never break the
 * surrounding request.
 */
export default async function s3DeleteFile({
	key,
}: {
	key: string;
}): Promise<boolean> {
	try {
		const client = getS3Instance();
		if (!client) return false;
		await client.send(
			new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }),
		);
		return true;
	} catch {
		return false;
	}
}
