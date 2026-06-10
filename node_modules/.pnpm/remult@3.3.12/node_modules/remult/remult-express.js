"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remultExpress = void 0;
exports.remultApi = remultApi;
var tslib_1 = require("tslib");
var express = tslib_1.__importStar(require("express"));
var index_js_1 = require("./server/index.js");
function remultApi(options) {
    var _this = this;
    var app = express.Router();
    if (!options) {
        options = {};
    }
    if (options.bodySizeLimit === undefined) {
        options.bodySizeLimit = '10mb';
    }
    var expressVersion = typeof app.del === 'function' ? 4 : 5;
    if ((options === null || options === void 0 ? void 0 : options.bodyParser) !== false) {
        app.use(express.json({ limit: options.bodySizeLimit }));
        app.use(express.urlencoded({ extended: true, limit: options.bodySizeLimit }));
    }
    var server = (0, index_js_1.createRemultServer)(options, {
        buildGenericRequestInfo: function (req) {
            var internal = tslib_1.__assign(tslib_1.__assign({}, req), { on: req.on });
            if (expressVersion === 5) {
                if (!internal.query) {
                    internal.query = req.query;
                }
            }
            return {
                internal: internal,
                public: { headers: new Headers(req.headers) },
            };
        },
        getRequestBody: function (req) { return tslib_1.__awaiter(_this, void 0, void 0, function () { return tslib_1.__generator(this, function (_a) {
            return [2 /*return*/, req.body];
        }); }); },
    });
    server.registerRouter(app);
    return Object.assign(app, {
        getRemult: function (req) { return server.getRemult(req); },
        openApiDoc: function (options) { return server.openApiDoc(options); },
        withRemult: function (req, res, next) { return server.withRemult(req, res, next); },
        withRemultAsync: function (req, what) {
            return server.withRemultAsync(req, what);
        },
    });
}
/** @deprecated use remultApi instead */
exports.remultExpress = remultApi;
