import { type RequestEvent } from 'solid-js/web';
import type { RemultServerCore, RemultServerOptions } from './server/index.js';
export declare function remultApi(options: RemultServerOptions<RequestEvent>): RemultSolidStartServer;
type RequestHandler = (event: RequestEvent) => Promise<Response>;
export type RemultSolidStartServer = RemultServerCore<RequestEvent> & {
    withRemult<T>(what: () => Promise<T>): Promise<T>;
    GET: RequestHandler;
    PUT: RequestHandler;
    POST: RequestHandler;
    DELETE: RequestHandler;
};
/** @deprecated use remultApi instead */
export declare const remultSolidStart: typeof remultApi;
export {};
