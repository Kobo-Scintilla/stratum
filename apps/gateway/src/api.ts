import { remultApi } from 'remult/remult-hono';
import { SqlDatabase } from 'remult';
import { Database } from 'bun:sqlite';
import { BunSqliteDataProvider } from 'remult/remult-bun-sqlite';
import { ActiveStream } from '@opaius/shared/entities/active-stream.js';
import { ChatMessage } from '@opaius/shared/entities/chat-message.js';
import { ProviderSetting } from '@opaius/shared/entities/provider-setting.js';
import { ChatSessionSettings } from '@opaius/shared/entities/chat-session-settings.js';
import { AgentService } from './agent-service.js';

const DB_PATH = process.env['DATABASE_URL'] || 'db.sqlite';
const db = new Database(DB_PATH);
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA synchronous = NORMAL');

try { db.run(`CREATE INDEX IF NOT EXISTS idx_chatMessages_sessionId ON chatMessages(sessionId)`); } catch {}
try { db.run(`CREATE INDEX IF NOT EXISTS idx_chatMessages_sortOrder ON chatMessages(sortOrder)`); } catch {}
try { db.run(`CREATE INDEX IF NOT EXISTS idx_activeStreams_sessionId ON activeStreams(sessionId)`); } catch {}

try {
	db.run(`ALTER TABLE providerSettings ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1`);
} catch { /* column exists */ }

const dataProvider = new SqlDatabase(new BunSqliteDataProvider(db));

export const api = remultApi({
	entities: [ActiveStream, ChatMessage, ProviderSetting, ChatSessionSettings],
	controllers: [AgentService],
	dataProvider,
	admin: true
});
