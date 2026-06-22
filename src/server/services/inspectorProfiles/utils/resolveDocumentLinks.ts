import "server-only";
import { s3GetFileLink } from "@/server/helpers";

// Inspector profile documents (id, certificate, extra) are persisted as S3
// keys. On read they must be resolved to presigned links before the client can
// render them. `expiresInSeconds` should be the cache TTL of the data being
// served, so the link stays valid for as long as that payload is fresh.

type DocsHolder = {
	documents?: {
		idDocument?: string;
		certificate?: string;
		extra?: string;
	} | null;
	// Mongoose documents expose `toObject`; plain (lean/cached/aggregate)
	// objects don't.
	toObject?: () => unknown;
};

async function resolveKey(
	key: string | undefined,
	expiresInSeconds: number,
): Promise<string | undefined> {
	if (!key) return undefined;
	return s3GetFileLink({ fileName: key, expiresInSeconds }).catch(() => key);
}

/**
 * Returns a shallow copy of `row` whose `documents` S3 keys are resolved to
 * presigned links. Normalises Mongoose documents to plain objects first, and
 * never mutates the (often cache-owned) source.
 */
export default async function resolveDocumentLinks<T extends DocsHolder>(
	row: T,
	expiresInSeconds: number,
): Promise<T> {
	const plain = (row.toObject?.() ?? row) as T;
	const docs = plain.documents;
	if (!docs) return plain;
	const [idDocument, certificate, extra] = await Promise.all([
		resolveKey(docs.idDocument, expiresInSeconds),
		resolveKey(docs.certificate, expiresInSeconds),
		resolveKey(docs.extra, expiresInSeconds),
	]);
	return {
		...plain,
		documents: {
			...docs,
			...(idDocument !== undefined ? { idDocument } : {}),
			...(certificate !== undefined ? { certificate } : {}),
			...(extra !== undefined ? { extra } : {}),
		},
	};
}
