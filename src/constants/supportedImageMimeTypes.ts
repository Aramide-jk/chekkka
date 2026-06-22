export const supportedImageMimeTypes = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
	"image/heic",
	"image/heif",
] as const;

export type SupportedImageMime = (typeof supportedImageMimeTypes)[number];
