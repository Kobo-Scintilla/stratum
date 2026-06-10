import type { Handle, RequestEvent, RequestHandler } from '@sveltejs/kit';
import type { RemultServerCore, RemultServerOptions, RemultServer } from './server/index.js';
export declare function remultApi(options: RemultServerOptions<RequestEvent>): RemultSveltekitServer;
export type RemultSveltekitServer = RemultServerCore<RequestEvent> & Handle & {
    withRemult: RemultServer<RequestEvent>['withRemultAsync'];
    GET: RequestHandler;
    PUT: RequestHandler;
    POST: RequestHandler;
    DELETE: RequestHandler;
};
/** @deprecated use remultApi instead */
export declare const remultSveltekit: typeof remultApi;
