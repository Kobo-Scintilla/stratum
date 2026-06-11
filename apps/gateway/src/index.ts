import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { api } from "./api.js";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

app.route("", api);

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/api/info", (c) =>
  c.json({
    uptime: process.uptime(),
    nodeVersion: process.versions.node,
    bunVersion: Bun.version,
  }),
);

const port = parseInt(process.env["GATEWAY_PORT"] || "3001", 10);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Gateway listening on http://localhost:${info.port}`);
});
