const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.BAIpFtqp.js",app:"_app/immutable/entry/app.DDXNUHSk.js",imports:["_app/immutable/entry/start.BAIpFtqp.js","_app/immutable/chunks/8ag90XOH.js","_app/immutable/chunks/BH80Zmid.js","_app/immutable/entry/app.DDXNUHSk.js","_app/immutable/chunks/D47zquao.js","_app/immutable/chunks/CpL_NGjS.js","_app/immutable/chunks/BH80Zmid.js","_app/immutable/chunks/kNaey6uv.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-CnIJd76Y.js')),
			__memo(() => import('./chunks/1-DCoRV63j.js')),
			__memo(() => import('./chunks/2-BgzLiGlg.js')),
			__memo(() => import('./chunks/3-CEmt5h1y.js')),
			__memo(() => import('./chunks/4-Cedx5T_I.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/api/[...remult]",
				pattern: /^\/api(?:\/([^]*))?\/?$/,
				params: [{"name":"remult","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D9SM2aMI.js'))
			},
			{
				id: "/dashboard/[[sessionId]]",
				pattern: /^\/dashboard(?:\/([^/]+))?\/?$/,
				params: [{"name":"sessionId","optional":true,"rest":false,"chained":true}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 4 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
