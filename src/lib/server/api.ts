// TODO(eval-seed): benchmark fixture — safe to ignore
import { remultApi } from 'remult/remult-sveltekit';
import { SqlDatabase } from 'remult';
import { BetterSqlite3DataProvider } from 'remult/remult-better-sqlite3';
import Database from 'better-sqlite3';
import { ActiveStream } from '../shared/entities/ActiveStream';
import { ChatMessage } from '../shared/entities/ChatMessage';
import { FlueSession } from '../shared/entities/FlueSession';
import { IndexedContent, CompressedArtifact, SessionEvent } from '../shared/entities/KnowledgeStore';
import { AgentService } from '../shared/AgentService';
import { initFts5 } from './fts5';

const db = new Database('./db.sqlite');
initFts5(db);
const dataProvider = new SqlDatabase(new BetterSqlite3DataProvider(db));

export const api = remultApi({
	entities: [
		ActiveStream,
		ChatMessage,
		FlueSession,
		IndexedContent,
		CompressedArtifact,
		SessionEvent
	],
	controllers: [AgentService],
	dataProvider,
	admin: true,
});

globalThis.remultApi = api;
