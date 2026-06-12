import { remultApi } from "remult/remult-hono";
import { SqlDatabase } from "remult";
import { Database } from "bun:sqlite";
import { BunSqliteDataProvider } from "remult/remult-bun-sqlite";
import { ActiveStream } from "@stratum/shared/entities/active-stream.js";
import { ChatMessage } from "@stratum/shared/entities/chat-message.js";
import { ProviderSetting } from "@stratum/shared/entities/provider-setting.js";
import { ChatSessionSettings } from "@stratum/shared/entities/chat-session-settings.js";
import { AppSettings } from "@stratum/shared/entities/app-settings.js";
import { AgentService } from "./agent-service.js";

const DB_PATH = process.env["DATABASE_URL"] || "db.sqlite";
const db = new Database(DB_PATH);
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA synchronous = NORMAL");

try {
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_chatMessages_sessionId ON chatMessages(sessionId)`,
  );
} catch {}
try {
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_chatMessages_sortOrder ON chatMessages(sortOrder)`,
  );
} catch {}
try {
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_activeStreams_sessionId ON activeStreams(sessionId)`,
  );
} catch {}

try {
  db.run(
    `ALTER TABLE providerSettings ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1`,
  );
} catch {
  /* column exists */
}

const dataProvider = new SqlDatabase(new BunSqliteDataProvider(db));

export const api = remultApi({
  entities: [
    ActiveStream,
    ChatMessage,
    ProviderSetting,
    ChatSessionSettings,
    AppSettings,
  ],
  controllers: [AgentService],
  dataProvider,
  admin: true,
});
