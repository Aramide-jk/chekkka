// Per-domain service modules. Each domain owns its query keys, dual-layer
// caches, and `utils/invalidateCacheKeys.ts`. Route handlers should import
// from these modules (or the named convenience re-exports below) rather than
// from `@/server/models` directly.
export * as admin from "./admin";
export * as adminAuditLogs from "./adminAuditLogs";
export * as auth from "./auth";
export * as brokerRequests from "./brokerRequests";
export * as chats from "./chats";
export * as dashboard from "./dashboard";
export * as disputes from "./disputes";
export * as inspectionPhotos from "./inspectionPhotos";
export * as inspections from "./inspections";
export * as inspectorProfiles from "./inspectorProfiles";
export * as managers from "./managers";
export * as messages from "./messages";
export * as notifications from "./notifications";
// Convenience re-exports for the most-used helpers (these are the only
// service functions we expect to import unnamespaced).
export { emitNotification } from "./notifications";
export * as siteConfigs from "./siteConfigs";
export * as transactions from "./transactions";
export * as users from "./users";
