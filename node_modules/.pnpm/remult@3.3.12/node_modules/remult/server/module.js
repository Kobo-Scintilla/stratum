"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modulesFlatAndOrdered = exports.Module = void 0;
var tslib_1 = require("tslib");
var Module = /** @class */ (function () {
    function Module(options) {
        var _a;
        this.key = options.key;
        this.priority = (_a = options.priority) !== null && _a !== void 0 ? _a : 0;
        this.entities = options.entities;
        this.controllers = options.controllers;
        this.initApi = options.initApi;
        this.initRequest = options.initRequest;
        this.modules = options.modules;
    }
    return Module;
}());
exports.Module = Module;
/**
 * Full flat and ordered list by index and concatenaining the modules name
 */
var modulesFlatAndOrdered = function (modules) {
    var flattenModules = function (modules, parentName) {
        if (parentName === void 0) { parentName = ''; }
        return modules.reduce(function (acc, module) {
            var fullKey = parentName ? "".concat(parentName, "-").concat(module.key) : module.key;
            // Create a new module object without the 'modules' property
            var _ = module.modules, flatModule = tslib_1.__rest(module, ["modules"]);
            var newModule = tslib_1.__assign(tslib_1.__assign({}, flatModule), { key: fullKey });
            var subModules = module.modules
                ? flattenModules(module.modules, fullKey)
                : [];
            return tslib_1.__spreadArray(tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(acc), false), [newModule], false), tslib_1.__read(subModules), false);
        }, []);
    };
    var flatModules = flattenModules(modules);
    flatModules.sort(function (a, b) { return a.priority - b.priority; });
    return flatModules;
};
exports.modulesFlatAndOrdered = modulesFlatAndOrdered;
