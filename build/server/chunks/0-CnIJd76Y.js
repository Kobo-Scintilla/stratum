//#region src/routes/+layout.server.ts
function load({ cookies }) {
	const raw = cookies.get("nav-active-tab");
	let activeTab = null;
	if (raw) try {
		activeTab = JSON.parse(raw);
	} catch {}
	return { activeTab };
}

var _layout_server_ts = /*#__PURE__*/Object.freeze({
	__proto__: null,
	load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-C88Il1VI.js')).default;
const server_id = "src/routes/+layout.server.ts";
const imports = ["_app/immutable/nodes/0.Qt0netGf.js","_app/immutable/chunks/BH80Zmid.js","_app/immutable/chunks/Dwn8Ttmm.js","_app/immutable/chunks/CpL_NGjS.js","_app/immutable/chunks/utne7muf.js","_app/immutable/chunks/BIiNy3-z.js","_app/immutable/chunks/xihTtKlq.js"];
const stylesheets = ["_app/immutable/assets/0.COz-5yTt.css"];
const fonts = ["_app/immutable/assets/outfit-latin-ext-wght-normal.DdQaqQDo.woff2","_app/immutable/assets/outfit-latin-wght-normal.Bc-8i84L.woff2"];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=0-CnIJd76Y.js.map
