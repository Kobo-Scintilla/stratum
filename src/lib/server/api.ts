import { remultApi } from 'remult/remult-sveltekit';
import { SqlDatabase } from 'remult';
import { BetterSqlite3DataProvider } from 'remult/remult-better-sqlite3';
import Database from 'better-sqlite3';
import { ActiveStream } from '../shared/entities/ActiveStream';
import { ChatMessage } from '../shared/entities/ChatMessage';
import { FlueSession } from '../shared/entities/FlueSession';
import { AgentService } from '../shared/AgentService';

const db = new Database('./db.sqlite');
const dataProvider = new SqlDatabase(new BetterSqlite3DataProvider(db));

export const api = remultApi({
	entities: [ActiveStream, ChatMessage, FlueSession],
	controllers: [AgentService],
	dataProvider,
	admin: true,
});

globalThis.remultApi = api;
