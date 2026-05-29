import { log as logtail } from "@logtail/next";

const SENSITIVE = /secret|key|signature|token/i;

function sanitize(meta: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(meta).map(([k, v]) => [k, SENSITIVE.test(k) ? "[REDACTED]" : v])
  );
}

export function log(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  meta: Record<string, unknown> = {}
) {
  logtail[level](message, sanitize(meta));
}
