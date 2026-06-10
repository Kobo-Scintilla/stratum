"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.D1HttpClient = exports.D1DataProvider = void 0;
exports.createD1HttpDataProvider = createD1HttpDataProvider;
var tslib_1 = require("tslib");
var cloudflare_1 = tslib_1.__importDefault(require("cloudflare"));
var index_js_1 = require("./index.js");
var remult_d1_js_1 = require("./remult-d1.js");
Object.defineProperty(exports, "D1DataProvider", { enumerable: true, get: function () { return remult_d1_js_1.D1DataProvider; } });
function createD1HttpDataProvider(creds) {
    return new index_js_1.SqlDatabase(new remult_d1_js_1.D1DataProvider(new D1HttpClient(creds)));
}
var D1HttpClient = /** @class */ (function () {
    function D1HttpClient(_a) {
        var accountId = _a.accountId, databaseId = _a.databaseId, apiToken = _a.apiToken;
        this.d1 = new cloudflare_1.default({ apiToken: apiToken }).d1.database;
        this.accountId = accountId;
        this.databaseId = databaseId;
    }
    D1HttpClient.prototype.execute = function (sql_1) {
        return tslib_1.__awaiter(this, arguments, void 0, function (sql, params) {
            if (params === void 0) { params = []; }
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, this.d1
                        .query(this.databaseId, {
                        sql: sql,
                        params: params,
                        account_id: this.accountId,
                    })
                        .then(function (_a) {
                        var pages = _a.result;
                        return pages.flatMap(function (page) { return page.results; });
                    })
                    // NOTE: d1 query endpoint returns the result as array of object with keys as column names.
                    // We're returning that now because the rest of remult seems to expect that.
                    // D1 also has a more efficient raw() endpoint that returns {columns: string[], rows: any[][]} that we may want
                    // to use eventually, and write code like fromRowToSql()
                    // at https://github.com/tursodatabase/libsql-client-ts/blob/main/packages/libsql-client/src/sqlite3.ts#L398
                    // to adapt the data
                ];
            });
        });
    };
    return D1HttpClient;
}());
exports.D1HttpClient = D1HttpClient;
