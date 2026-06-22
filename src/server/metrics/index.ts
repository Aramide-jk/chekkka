import client, { collectDefaultMetrics } from "prom-client";

declare global {
	// eslint-disable-next-line no-var
	var __chekkaMetricsInit: boolean | undefined;
	// eslint-disable-next-line no-var
	var __chekkaRestHistogram: client.Histogram<string> | undefined;
	// eslint-disable-next-line no-var
	var __chekkaDbHistogram: client.Histogram<string> | undefined;
}

if (!global.__chekkaMetricsInit) {
	collectDefaultMetrics();
	global.__chekkaMetricsInit = true;
}

export const restResponseTimeHistogram: client.Histogram<string> =
	global.__chekkaRestHistogram ??
	new client.Histogram({
		name: "http_request_duration_seconds",
		help: "Duration of HTTP requests in seconds",
		labelNames: ["ip", "method", "route", "status_code"],
	});

if (!global.__chekkaRestHistogram) {
	global.__chekkaRestHistogram = restResponseTimeHistogram;
}

export const databaseResponseTimeHistogram: client.Histogram<string> =
	global.__chekkaDbHistogram ??
	new client.Histogram({
		name: "database_request_duration_seconds",
		help: "Duration of database requests in seconds",
		labelNames: ["operation", "collection", "method", "success"],
	});

if (!global.__chekkaDbHistogram) {
	global.__chekkaDbHistogram = databaseResponseTimeHistogram;
}

export enum IOperationType {
	Create = "create",
	Read = "read",
	Update = "update",
	Delete = "delete",
	Aggregate = "aggregate",
}

export async function renderMetrics(): Promise<{
	contentType: string;
	body: string;
}> {
	return {
		contentType: client.register.contentType,
		body: await client.register.metrics(),
	};
}
