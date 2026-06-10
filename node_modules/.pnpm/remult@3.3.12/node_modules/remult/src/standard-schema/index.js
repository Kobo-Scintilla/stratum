"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.standardSchema = standardSchema;
var tslib_1 = require("tslib");
/**
 * Implementation of the [Standard Schema](https://standardschema.dev/) specification
 *
 * @example
 * ```ts
 * // The schema for the entire entity
 * const schema = standardSchema(repo(User))
 *
 * // The schema for a specific field
 * const schema = standardSchema(repo(User), 'id')
 *
 * // The schema for multiple fields
 * const schema = standardSchema(repo(User), 'name', 'age')
 * ```
 */
function standardSchema(repo) {
    var fields = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        fields[_i - 1] = arguments[_i];
    }
    return {
        '~standard': {
            version: 1,
            vendor: 'remult',
            validate: function (value) {
                return tslib_1.__awaiter(this, void 0, void 0, function () {
                    var item, error, err_1, filteredItem, fields_1, fields_1_1, field;
                    var e_1, _a;
                    return tslib_1.__generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                if (typeof value !== 'object') {
                                    if (fields.length > 0) {
                                        return [2 /*return*/, {
                                                issues: [
                                                    {
                                                        message: "Invalid shape, expected: { ".concat(fields
                                                            .map(function (f) { return "".concat(String(f), ": ___"); })
                                                            .join(', '), " }"),
                                                        path: [],
                                                    },
                                                ],
                                            }];
                                    }
                                    return [2 /*return*/, {
                                            issues: [
                                                {
                                                    message: "Invalid shape, expected an object of entity: ".concat(String(repo.metadata.key)),
                                                    path: [],
                                                },
                                            ],
                                        }];
                                }
                                item = value;
                                _b.label = 1;
                            case 1:
                                _b.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, repo.validate.apply(repo, tslib_1.__spreadArray([item], tslib_1.__read(fields), false))];
                            case 2:
                                error = _b.sent();
                                if (error && error.modelState) {
                                    return [2 /*return*/, {
                                            issues: Object.entries(error.modelState).map(function (_a) {
                                                var _b = tslib_1.__read(_a, 2), key = _b[0], message = _b[1];
                                                return ({
                                                    message: message,
                                                    path: [key],
                                                });
                                            }),
                                        }];
                                }
                                return [3 /*break*/, 4];
                            case 3:
                                err_1 = _b.sent();
                                if (err_1 instanceof Error) {
                                    return [2 /*return*/, { issues: [{ message: err_1.message, path: [] }] }];
                                }
                                return [3 /*break*/, 4];
                            case 4:
                                if (fields.length > 0) {
                                    filteredItem = {};
                                    try {
                                        for (fields_1 = tslib_1.__values(fields), fields_1_1 = fields_1.next(); !fields_1_1.done; fields_1_1 = fields_1.next()) {
                                            field = fields_1_1.value;
                                            if (field in item) {
                                                filteredItem[field] = item[field];
                                            }
                                        }
                                    }
                                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                                    finally {
                                        try {
                                            if (fields_1_1 && !fields_1_1.done && (_a = fields_1.return)) _a.call(fields_1);
                                        }
                                        finally { if (e_1) throw e_1.error; }
                                    }
                                    return [2 /*return*/, { value: filteredItem }];
                                }
                                return [2 /*return*/, { value: item }];
                        }
                    });
                });
            },
        },
    };
}
