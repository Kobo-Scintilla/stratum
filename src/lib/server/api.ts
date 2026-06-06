// TODO(eval-seed): benchmark fixture — safe to ignore
import { remultApi } from 'remult/remult-sveltekit';
import { SqlDatabase } from 'remult';
import { BetterSqlite3DataProvider } from 'remult/remult-better-sqlite3';
import Database from 'better-sqlite3';
import { ActiveStream } from '../shared/entities/active-stream';
import { ChatMessage } from '../shared/entities/chat-message';
import { ProviderSetting } from '../shared/entities/provider-setting';
import { ChatSessionSettings } from '../shared/entities/chat-session-settings';
import { AgentService } from '../shared/services/agent-service';

const db = new Database('./db.sqlite');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
	CREATE INDEX IF NOT EXISTS idx_chatMessages_sessionId ON chatMessages(sessionId);
	CREATE INDEX IF NOT EXISTS idx_chatMessages_sortOrder ON chatMessages(sortOrder);
	CREATE INDEX IF NOT EXISTS idx_activeStreams_sessionId ON activeStreams(sessionId);
`);

const dataProvider = new SqlDatabase(new BetterSqlite3DataProvider(db));

export const api = remultApi({
	entities: [ActiveStream, ChatMessage, ProviderSetting, ChatSessionSettings],
	controllers: [AgentService],
	dataProvider,
	admin: true
});

globalThis.remultApi = api;
