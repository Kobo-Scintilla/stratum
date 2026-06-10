import { createRemultServerCore } from './server/remult-api-server.js';
export function remultApi(options, response) {
    const server = createRemultServerCore(options, {
        buildGenericRequestInfo: (r) => ({
            // @ts-ignore
            internal: { ...r, on: r.on },
            public: { headers: r.headers },
        }),
        getRequestBody: (req) => req.json(),
    });
    return {
        getRemult: (r) => server.getRemult(r),
        openApiDoc: (x) => server.openApiDoc(x),
        handle: async (req, ctx) => {
            let init = {};
            const res = await server.handle(req);
            if (res) {
                init.status = res.statusCode;
                if (res.data) {
                    return response.json(res.data, init);
                }
                else
                    return new response(undefined, init);
            }
            else {
                return ctx.next();
            }
        },
    };
}
/** @deprecated use remultApi instead */
export const remultFresh = remultApi;
