import type { H3Event } from 'h3';
import type { RemultServerCore, RemultServerOptions, RemultServer } from './server/index.js';
export declare function remultApi(options: RemultServerOptions<H3Event>): RemultNuxtServer;
export type RemultNuxtServer = RemultServerCore<H3Event> & ((event: H3Event) => Promise<any>) & {
    withRemult: RemultServer<H3Event>['withRemultAsync'];
};
/** @deprecated use remultApi instead */
export declare const remultNuxt: typeof remultApi;
