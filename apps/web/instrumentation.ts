import { log } from "@logtail/next";

export async function register() {
  log.info("SolarProof API initializing", { env: process.env.NODE_ENV });
}
