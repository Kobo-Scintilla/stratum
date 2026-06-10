"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entityDbName = entityDbName;
var tslib_1 = require("tslib");
function entityDbName(metadata_1) {
    return tslib_1.__awaiter(this, arguments, void 0, function (metadata, wrapIdentifier) {
        var prev;
        if (wrapIdentifier === void 0) { wrapIdentifier = function (x) { return x; }; }
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!metadata.options.sqlExpression) return [3 /*break*/, 5];
                    if (!(typeof metadata.options.sqlExpression === 'string')) return [3 /*break*/, 1];
                    return [2 /*return*/, metadata.options.sqlExpression];
                case 1:
                    if (!(typeof metadata.options.sqlExpression === 'function')) return [3 /*break*/, 5];
                    prev = metadata.options.sqlExpression;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    metadata.options.sqlExpression =
                        "recursive sqlExpression call for entity '" + metadata.key + "'. ";
                    return [4 /*yield*/, prev(metadata)];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    metadata.options.sqlExpression = prev;
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/, wrapIdentifier(metadata.dbName)];
            }
        });
    });
}
