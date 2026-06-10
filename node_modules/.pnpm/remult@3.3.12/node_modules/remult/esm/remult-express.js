import * as express from 'express';
import { createRemultServer } from './server/index.js';
export function remultApi(options) {
    let app = express.Router();
    if (!options) {
        options = {};
    }
    if (options.bodySizeLimit === undefined) {
        options.bodySizeLimit = '10mb';
    }
    const expressVersion = typeof app.del === 'function' ? 4 : 5;
    if (options?.bodyParser !== false) {
        app.use(express.json({ limit: options.bodySizeLimit }));
        app.use(express.urlencoded({ extended: true, limit: options.bodySizeLimit }));
    }
    const server = createRemultServer(options, {
        buildGenericRequestInfo: (req) => {
            const internal = { ...req, on: req.on };
            if (expressVersion === 5) {
                if (!internal.query) {
                    internal.query = req.query;
                }
            }
            return {
                internal,
                public: { headers: new Headers(req.headers) },
            };
        },
        getRequestBody: async (req) => req.body,
    });
    server.registerRouter(app);
    return Object.assign(app, {
        getRemult: (req) => server.getRemult(req),
        openApiDoc: (options) => server.openApiDoc(options),
        withRemult: (req, res, next) => server.withRemult(req, res, next),
        withRemultAsync: (req, what) => server.withRemultAsync(req, what),
    });
}
/** @deprecated use remultApi instead */
export const remultExpress = remultApi;
