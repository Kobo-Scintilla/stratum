import * as express from 'express';
import type { RemultServer, RemultServerCore, RemultServerOptions } from './server/remult-api-server.js';
export declare function remultApi(options?: RemultServerOptions<express.Request> & {
    bodyParser?: boolean;
    bodySizeLimit?: string;
}): remultApiServer;
export type remultApiServer = express.RequestHandler & RemultServerCore<express.Request> & {
    withRemult: (req: express.Request, res: express.Response, next: VoidFunction) => void;
} & Pick<RemultServer<express.Request>, 'withRemultAsync'>;
/** @deprecated use remultApi instead */
export declare const remultExpress: typeof remultApi;
