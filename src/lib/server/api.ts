// TODO(eval-seed): benchmark fixture — safe to ignore
import { remultApi } from 'remult/remult-sveltekit';
import { SqlDatabase } from 'remult';
import { BetterSqlite3DataProvider } from 'remult/remult-better-sqlite3';
import Database from 'better-sqlite3';
import { ActiveStream } from '../shared/entities/active-stream';
import { ChatMessage } from '../shared/entities/chat-message';
import { AgentService } from '../shared/services/agent-service';

const db = new Database('./db.sqlite');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
const dataProvider = new SqlDatabase(new BetterSqlite3DataProvider(db));

export const api = remultApi({
	entities: [ActiveStream, ChatMessage],
	controllers: [AgentService],
	dataProvider,
	admin: true
});

globalThis.remultApi = api;
