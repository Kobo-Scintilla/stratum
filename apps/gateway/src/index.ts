import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { api } from "./api.js";
import { auth } from "./auth.js";
import { streamText } from "hono/streaming";
import { spawn } from "node:child_process";
import { VENV_PYTHON } from "./agent-runtime/headroom/proxy.js";
import { AgentService } from "./agent-service.js";

const app = new Hono();

// CORS: frontend dev server
app.use(
  "/*",
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

// Remult API
app.route("", api);

// better-auth handler: /api/auth/* (after Remult to ensure it catches /api/auth/*)
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/api/headroom/install", (c) => {
  const feature = c.req.query("feature");
  if (feature !== "code" && feature !== "ml") {
    return c.json({ error: "Invalid feature. Must be 'code' or 'ml'." }, 400);
  }

  const packageName =
    feature === "code" ? "headroom-ai[code]" : "headroom-ai[ml]";

  return streamText(c, async (stream) => {
    await stream.writeln(`Starting installation of ${packageName}...`);

    const proc = spawn(
      VENV_PYTHON,
      ["-m", "pip", "install", packageName, "--disable-pip-version-check"],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    proc.stdout.on("data", (chunk) => {
      stream.write(chunk.toString());
    });

    proc.stderr.on("data", (chunk) => {
      stream.write(chunk.toString());
    });

    const exitPromise = new Promise<number>((resolve) => {
      proc.on("close", (code) => {
        resolve(code ?? 0);
      });
    });

    const exitCode = await exitPromise;
    if (exitCode === 0) {
      AgentService.invalidateHeadroomFeaturesCache();
      await stream.writeln(
        `\nInstallation of ${packageName} completed successfully!`,
      );
    } else {
      await stream.writeln(`\nInstallation failed with exit code ${exitCode}`);
    }
  });
});

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
