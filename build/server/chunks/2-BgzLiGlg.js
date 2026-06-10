import { A as AgentService } from './agent-service-ZiiPDM6E.js';
import './chat-message-CwAUUCQ1.js';
import './IdEntity-Le34BexZ.js';
import './chat-session-settings-C_T3OJ8l.js';
import '@earendil-works/pi-ai';

//#region src/routes/dashboard/+layout.server.ts
async function load() {
	return { sessions: await AgentService.listSessions() };
}

var _layout_server_ts = /*#__PURE__*/Object.freeze({
	__proto__: null,
	load: load
});

const index = 2;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-DR8YK-zF.js')).default;
const server_id = "src/routes/dashboard/+layout.server.ts";
const imports = ["_app/immutable/nodes/2.CE64pbfL.js","_app/immutable/chunks/BH80Zmid.js","_app/immutable/chunks/CcCiB77-.js","_app/immutable/chunks/D47zquao.js","_app/immutable/chunks/CpL_NGjS.js","_app/immutable/chunks/kNaey6uv.js","_app/immutable/chunks/Dwn8Ttmm.js","_app/immutable/chunks/8ag90XOH.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/utne7muf.js"];
const stylesheets = ["_app/immutable/assets/2.y7_3edA1.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=2-BgzLiGlg.js.map
