"use strict";
/// <reference types="@cloudflare/workers-types" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.D1BindingClient = exports.D1DataProvider = void 0;
exports.createD1DataProvider = createD1DataProvider;
var tslib_1 = require("tslib");
var index_js_1 = require("./index.js");
var remult_sqlite_core_js_1 = require("./remult-sqlite-core.js");
function createD1DataProvider(d1) {
    return new index_js_1.SqlDatabase(new D1DataProvider(new D1BindingClient(d1)));
}
var D1DataProvider = /** @class */ (function (_super) {
    tslib_1.__extends(D1DataProvider, _super);
    /**
     * For production or local d1 using binding
     *
     * const dataProvider = new SqlDatabase(new D1DataProvider(new D1BindingClient(d1)))
     */
    function D1DataProvider(d1) {
        var _this = _super.call(this, function () { return new D1Command(_this.d1); }, function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/];
            });
        }); }) || this;
        _this.d1 = d1;
        return _this;
    }
    D1DataProvider.prototype.transaction = function (action) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // As of June 2025, D1 doesn't support transactions
                    // Here we simply run the action without wrapping it in a transaction
                    // It means queries in action() will be run individually (this is the same decision prisma made)
                    return [4 /*yield*/, action(this)];
                    case 1:
                        // As of June 2025, D1 doesn't support transactions
                        // Here we simply run the action without wrapping it in a transaction
                        // It means queries in action() will be run individually (this is the same decision prisma made)
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return D1DataProvider;
}(remult_sqlite_core_js_1.SqliteCoreDataProvider));
exports.D1DataProvider = D1DataProvider;
var D1BindingClient = /** @class */ (function () {
    /**
     * Simple d1 client that wraps the d1 binding directly
     *
     * const d1 = new D1BindingClient(env.DB)
     */
    function D1BindingClient(d1) {
        this.d1 = d1;
    }
    D1BindingClient.prototype.execute = function (sql_1) {
        return tslib_1.__awaiter(this, arguments, void 0, function (sql, params) {
            var results;
            var _a;
            if (params === void 0) { params = []; }
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (_a = this.d1
                            .prepare(sql))
                            .bind.apply(_a, tslib_1.__spreadArray([], tslib_1.__read(params), false)).run()];
                    case 1:
                        results = (_b.sent()).results;
                        return [2 /*return*/, results];
                }
            });
        });
    };
    return D1BindingClient;
}());
exports.D1BindingClient = D1BindingClient;
var D1Command = /** @class */ (function () {
    function D1Command(d1) {
        this.params = [];
        this.d1 = d1;
    }
    D1Command.prototype.execute = function (sql) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var results;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.d1.execute(sql, this.params)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, new D1SqlResult(results)];
                }
            });
        });
    };
    /** @deprecated use `param` instead*/
    D1Command.prototype.addParameterAndReturnSqlToken = function (val) {
        return this.param(val);
    };
    D1Command.prototype.param = function (val) {
        var p;
        if (val instanceof Date)
            p = val.valueOf();
        else if (typeof val === 'boolean')
            p = val ? 1 : 0;
        else
            p = val;
        this.params.push(p);
        // According to https://developers.cloudflare.com/d1/worker-api/prepared-statements/
        // only the ordered "?NNN" and anonymous "?" param types are supported (although :AAAA seems to work too)
        var key = "?".concat(this.params.length);
        return key;
    };
    return D1Command;
}());
var D1SqlResult = /** @class */ (function () {
    function D1SqlResult(rows) {
        if (rows === void 0) { rows = []; }
        this.rows = rows;
        // NOTE: are we guaranteed that when this is reached, rows is not empty?
        this.columns = rows.length === 0 ? [] : Object.keys(rows[0]);
    }
    D1SqlResult.prototype.getColumnKeyInResultForIndexInSelect = function (index) {
        return this.columns[index];
    };
    return D1SqlResult;
}());
