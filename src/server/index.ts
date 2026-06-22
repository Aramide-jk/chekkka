// Server barrel — re-exported for convenience inside route handlers.
// Each /api/* route imports from "@/server/lib", "@/server/constants",
// "@/server/services", etc. directly — this file is intentionally empty
// to avoid pulling server-only modules into client bundles.
export {};
