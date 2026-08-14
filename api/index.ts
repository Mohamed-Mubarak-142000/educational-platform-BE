import type { VercelRequest, VercelResponse } from "@vercel/node";
import connectDB from "../src/config/db";
import app from "../src/app";

// Vercel serverless entry point. Unlike src/server.ts (used for
// Render/local), this does NOT start Socket.IO or the node-cron jobs —
// neither works in a stateless, short-lived serverless function. Live
// classroom sessions and scheduled jobs (subscription/exam status cron)
// are only functional when this backend runs on a persistent host.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await connectDB();
  return (app as unknown as (req: VercelRequest, res: VercelResponse) => void)(req, res);
}
