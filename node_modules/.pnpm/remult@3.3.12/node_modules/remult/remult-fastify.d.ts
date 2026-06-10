import type { FastifyPluginCallback, FastifyRequest } from 'fastify';
import type { RemultServerCore, RemultServerOptions, RemultServer } from './server/remult-api-server.js';
export declare function remultApi(options: RemultServerOptions<FastifyRequest>): RemultFastifyServer;
export type RemultFastifyServer = FastifyPluginCallback & RemultServerCore<FastifyRequest> & {
    withRemult: RemultServer<FastifyRequest>['withRemultAsync'];
};
/** @deprecated use remultApi instead */
export declare const remultFastify: typeof remultApi;
