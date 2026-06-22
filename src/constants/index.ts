export type { IEnv } from "@/types";

export { default as api } from "./api";
export { default as defaultEnvOptions } from "./defaultEnvOptions";
export { default as fetcher } from "./fetcher";
export { default as formatNumber, NAIRA } from "./formatNumber";
export { default as getErrorMessage } from "./getErrorMessage";
export { default as getSeoMetadata } from "./getSeoMetadata";
export {
	type SupportedImageMime,
	supportedImageMimeTypes,
} from "./supportedImageMimeTypes";
export { default as verifyUserLogin } from "./verifyUserLogin";
