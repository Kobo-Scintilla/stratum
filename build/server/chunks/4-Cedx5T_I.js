import { C as ChatMessage } from './chat-message-CwAUUCQ1.js';
import { r as remult } from './IdEntity-Le34BexZ.js';

//#region src/routes/dashboard/[[sessionId]]/+page.server.ts
async function load({ params }) {
	const sessionId = params.sessionId;
	if (!sessionId) return { messages: [] };
	return { messages: [...await remult.repo(ChatMessage).find({
		where: { sessionId },
		orderBy: { sortOrder: "desc" },
		limit: 50
	})].reverse().map((m) => ({
		id: m.id,
		sessionId: m.sessionId,
		role: m.role,
		content: m.content,
		toolCalls: m.toolCalls,
		toolCallId: m.toolCallId,
		toolName: m.toolName,
		toolResult: m.toolResult,
		isError: m.isError,
		sortOrder: m.sortOrder,
		createdAt: m.createdAt.toISOString()
	})) };
}

var _page_server_ts = /*#__PURE__*/Object.freeze({
	__proto__: null,
	load: load
});

const index = 4;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte--Js7dKzN.js')).default;
const server_id = "src/routes/dashboard/[[sessionId]]/+page.server.ts";
const imports = ["_app/immutable/nodes/4.BJuCQUKN.js","_app/immutable/chunks/D47zquao.js","_app/immutable/chunks/CpL_NGjS.js","_app/immutable/chunks/BH80Zmid.js","_app/immutable/chunks/CcCiB77-.js","_app/immutable/chunks/kNaey6uv.js","_app/immutable/chunks/Dwn8Ttmm.js","_app/immutable/chunks/8ag90XOH.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/BIiNy3-z.js"];
const stylesheets = ["_app/immutable/assets/4.CAJSUKpI.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=4-Cedx5T_I.js.map
