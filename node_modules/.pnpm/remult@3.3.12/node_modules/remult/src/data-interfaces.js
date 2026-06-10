"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataProviderPromiseWrapper = exports.EntityError = void 0;
exports.extractSort = extractSort;
var tslib_1 = require("tslib");
var sort_js_1 = require("./sort.js");
function extractSort(sort) {
    if (sort instanceof Array) {
        var r_1 = new sort_js_1.Sort();
        sort.forEach(function (i) {
            r_1.Segments.push(i);
        });
        return r_1;
    }
    return sort;
}
var EntityError = /** @class */ (function (_super) {
    tslib_1.__extends(EntityError, _super);
    function EntityError(errorInfo) {
        var _this = _super.call(this, errorInfo.message) || this;
        Object.assign(_this, errorInfo);
        return _this;
    }
    return EntityError;
}(Error));
exports.EntityError = EntityError;
var DataProviderPromiseWrapper = /** @class */ (function () {
    function DataProviderPromiseWrapper(dataProvider) {
        this.dataProvider = dataProvider;
    }
    DataProviderPromiseWrapper.prototype.getEntityDataProvider = function (entity) {
        return new EntityDataProviderPromiseWrapper(this.dataProvider.then(function (dp) { return dp.getEntityDataProvider(entity); }));
    };
    DataProviderPromiseWrapper.prototype.transaction = function (action) {
        return this.dataProvider.then(function (dp) { return dp.transaction(action); });
    };
    DataProviderPromiseWrapper.prototype.ensureSchema = function (entities) {
        return this.dataProvider.then(function (dp) { var _a; return (_a = dp.ensureSchema) === null || _a === void 0 ? void 0 : _a.call(dp, entities); });
    };
    return DataProviderPromiseWrapper;
}());
exports.DataProviderPromiseWrapper = DataProviderPromiseWrapper;
var EntityDataProviderPromiseWrapper = /** @class */ (function () {
    function EntityDataProviderPromiseWrapper(dataProvider) {
        this.dataProvider = dataProvider;
    }
    EntityDataProviderPromiseWrapper.prototype.delete = function (id) {
        return this.dataProvider.then(function (dp) { return dp.delete(id); });
    };
    EntityDataProviderPromiseWrapper.prototype.insert = function (data) {
        return this.dataProvider.then(function (dp) { return dp.insert(data); });
    };
    EntityDataProviderPromiseWrapper.prototype.count = function (where) {
        return this.dataProvider.then(function (dp) { return dp.count(where); });
    };
    EntityDataProviderPromiseWrapper.prototype.find = function (options) {
        return this.dataProvider.then(function (dp) { return dp.find(options); });
    };
    EntityDataProviderPromiseWrapper.prototype.groupBy = function (options) {
        return this.dataProvider.then(function (dp) { return dp.groupBy(options); });
    };
    EntityDataProviderPromiseWrapper.prototype.update = function (id, data) {
        return this.dataProvider.then(function (dp) { return dp.update(id, data); });
    };
    return EntityDataProviderPromiseWrapper;
}());
