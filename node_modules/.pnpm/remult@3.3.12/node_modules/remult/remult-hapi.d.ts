import type { Request, Plugin } from '@hapi/hapi';
import { type RemultServerCore, type RemultServerOptions, type RemultServer } from './server/index.js';
export declare function remultApi(options: RemultServerOptions<Request>): RemultHapiServer;
export type RemultHapiServer = Plugin<any, any> & RemultServerCore<Request> & {
    withRemult: RemultServer<Request>['withRemultAsync'];
};
/** @deprecated use remultApi instead */
export declare const remultHapi: typeof remultApi;
