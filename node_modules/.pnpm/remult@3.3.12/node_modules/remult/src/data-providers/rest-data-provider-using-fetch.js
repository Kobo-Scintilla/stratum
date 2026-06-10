"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestDataProviderHttpProviderUsingFetch = void 0;
var tslib_1 = require("tslib");
var retry_js_1 = require("./retry.js");
var RestDataProviderHttpProviderUsingFetch = /** @class */ (function () {
    function RestDataProviderHttpProviderUsingFetch(fetch) {
        this.fetch = fetch;
    }
    RestDataProviderHttpProviderUsingFetch.prototype.get = function (url) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, retry_js_1.retry)(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            return tslib_1.__generator(this, function (_a) {
                                return [2 /*return*/, this.myFetch(url).then(function (r) {
                                        return r;
                                    })];
                            });
                        }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    RestDataProviderHttpProviderUsingFetch.prototype.put = function (url, data) {
        return this.myFetch(url, {
            method: 'put',
            body: JSON.stringify(data),
        });
    };
    RestDataProviderHttpProviderUsingFetch.prototype.delete = function (url) {
        return this.myFetch(url, { method: 'delete' });
    };
    RestDataProviderHttpProviderUsingFetch.prototype.post = function (url, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, retry_js_1.retry)(function () {
                            return _this.myFetch(url, {
                                method: 'post',
                                body: JSON.stringify(data),
                            });
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    RestDataProviderHttpProviderUsingFetch.prototype.myFetch = function (url, options) {
        var e_1, _a;
        var _this = this;
        var headers = {};
        if (options === null || options === void 0 ? void 0 : options.body)
            headers['Content-type'] = 'application/json';
        if (typeof window !== 'undefined' &&
            typeof window.document !== 'undefined' &&
            typeof (window.document.cookie !== 'undefined'))
            try {
                for (var _b = tslib_1.__values(window.document.cookie.split(';')), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var cookie = _c.value;
                    if (cookie.trim().startsWith('XSRF-TOKEN=')) {
                        headers['X-XSRF-TOKEN'] = cookie.split('=')[1];
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        return (this.fetch || fetch)(url, {
            credentials: 'include',
            method: options === null || options === void 0 ? void 0 : options.method,
            body: options === null || options === void 0 ? void 0 : options.body,
            headers: headers,
        })
            .then(function (response) {
            return onSuccess(response);
        })
            .catch(function (error) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
            var r;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, error];
                    case 1:
                        r = _a.sent();
                        throw r;
                }
            });
        }); });
    };
    return RestDataProviderHttpProviderUsingFetch;
}());
exports.RestDataProviderHttpProviderUsingFetch = RestDataProviderHttpProviderUsingFetch;
function onSuccess(response) {
    if (response.status == 204)
        return;
    if (response.status >= 200 && response.status < 300)
        return response.json();
    else {
        throw response
            .json()
            .then(function (x) {
            return tslib_1.__assign(tslib_1.__assign({}, x), { message: x.message || response.statusText, url: response.url, status: response.status });
        })
            .catch(function () {
            throw {
                message: response.statusText,
                url: response.url,
                status: response.status,
            };
        });
    }
}
