"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retry = retry;
var tslib_1 = require("tslib");
var remult3_js_1 = require("../remult3/remult3.js");
function retry(what) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var i, err_1;
        var _a, _b, _c, _d;
        return tslib_1.__generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    i = 0;
                    _e.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 8];
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, 4, , 7]);
                    return [4 /*yield*/, what()];
                case 3: return [2 /*return*/, _e.sent()];
                case 4:
                    err_1 = _e.sent();
                    if (!((((_a = err_1.message) === null || _a === void 0 ? void 0 : _a.startsWith('Error occurred while trying to proxy')) ||
                        ((_b = err_1.message) === null || _b === void 0 ? void 0 : _b.startsWith('Error occured while trying to proxy')) ||
                        ((_c = err_1.message) === null || _c === void 0 ? void 0 : _c.includes('http proxy error')) ||
                        ((_d = err_1.message) === null || _d === void 0 ? void 0 : _d.startsWith('Gateway Timeout')) ||
                        err_1.status == 500) &&
                        i++ < remult3_js_1.flags.error500RetryCount)) return [3 /*break*/, 6];
                    return [4 /*yield*/, new Promise(function (res, req) {
                            setTimeout(function () {
                                res({});
                            }, 500);
                        })];
                case 5:
                    _e.sent();
                    return [3 /*break*/, 1];
                case 6: throw err_1;
                case 7: return [3 /*break*/, 1];
                case 8: return [2 /*return*/];
            }
        });
    });
}
