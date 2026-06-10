"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpProviderBridgeToRestDataProviderHttpProvider = void 0;
exports.buildRestDataProvider = buildRestDataProvider;
exports.isExternalHttpProvider = isExternalHttpProvider;
exports.toPromise = toPromise;
exports.processHttpException = processHttpException;
var tslib_1 = require("tslib");
var rest_data_provider_using_fetch_js_1 = require("./data-providers/rest-data-provider-using-fetch.js");
var retry_js_1 = require("./data-providers/retry.js");
function buildRestDataProvider(provider) {
    if (!provider)
        return new rest_data_provider_using_fetch_js_1.RestDataProviderHttpProviderUsingFetch();
    var httpDataProvider;
    if (!httpDataProvider) {
        if (isExternalHttpProvider(provider)) {
            httpDataProvider = new HttpProviderBridgeToRestDataProviderHttpProvider(provider);
        }
    }
    if (!httpDataProvider) {
        if (typeof provider === 'function') {
            httpDataProvider = new rest_data_provider_using_fetch_js_1.RestDataProviderHttpProviderUsingFetch(provider);
        }
    }
    return httpDataProvider;
}
function isExternalHttpProvider(item) {
    var http = item;
    if (http && http.get && http.put && http.post && http.delete)
        return true;
    return false;
}
var HttpProviderBridgeToRestDataProviderHttpProvider = /** @class */ (function () {
    function HttpProviderBridgeToRestDataProviderHttpProvider(http) {
        this.http = http;
    }
    HttpProviderBridgeToRestDataProviderHttpProvider.prototype.post = function (url, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, retry_js_1.retry)(function () { return toPromise(_this.http.post(url, data)); })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    HttpProviderBridgeToRestDataProviderHttpProvider.prototype.delete = function (url) {
        return toPromise(this.http.delete(url));
    };
    HttpProviderBridgeToRestDataProviderHttpProvider.prototype.put = function (url, data) {
        return toPromise(this.http.put(url, data));
    };
    HttpProviderBridgeToRestDataProviderHttpProvider.prototype.get = function (url) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, retry_js_1.retry)(function () { return toPromise(_this.http.get(url)); })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return HttpProviderBridgeToRestDataProviderHttpProvider;
}());
exports.HttpProviderBridgeToRestDataProviderHttpProvider = HttpProviderBridgeToRestDataProviderHttpProvider;
function toPromise(p) {
    var _this = this;
    var r;
    if (p['toPromise'] !== undefined) {
        r = p['toPromise']();
    }
    //@ts-ignore
    else
        r = p;
    return r
        .then(function (x) {
        if (x &&
            (x.status == 200 || x.status == 201) &&
            x.headers &&
            x.request &&
            x.data !== undefined)
            //for axios
            return x.data;
        return x;
    })
        .catch(function (ex) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, processHttpException(ex)];
                case 1: throw _a.sent();
            }
        });
    }); });
}
function processHttpException(ex) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var z, error, httpStatusCode, result;
        var _a, _b, _c;
        return tslib_1.__generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, ex];
                case 1:
                    z = _d.sent();
                    if (z.error)
                        error = z.error;
                    else if (z.isAxiosError) {
                        if (typeof ((_a = z.response) === null || _a === void 0 ? void 0 : _a.data) === 'string')
                            error = z.response.data;
                        else
                            error = (_b = z === null || z === void 0 ? void 0 : z.response) === null || _b === void 0 ? void 0 : _b.data;
                    }
                    if (!error)
                        error = z.message;
                    if (z.status == 0 && z.error.isTrusted)
                        error = 'Network Error';
                    if (typeof error === 'string') {
                        error = {
                            message: error,
                        };
                    }
                    if (z.modelState)
                        error.modelState = z.modelState;
                    httpStatusCode = z.status;
                    if (httpStatusCode === undefined)
                        httpStatusCode = (_c = z.response) === null || _c === void 0 ? void 0 : _c.status;
                    if (httpStatusCode !== undefined && httpStatusCode !== null) {
                        error.httpStatusCode = httpStatusCode;
                    }
                    result = Object.assign(error !== null && error !== void 0 ? error : {}, {
                    //     exception: ex disabled for now because JSON.stringify crashed with this
                    });
                    return [2 /*return*/, result];
            }
        });
    });
}
