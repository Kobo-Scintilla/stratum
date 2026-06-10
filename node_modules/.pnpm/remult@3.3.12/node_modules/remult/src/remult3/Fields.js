"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Relations = exports.Fields = void 0;
exports.Field = Field;
exports.checkTarget = checkTarget;
var tslib_1 = require("tslib");
var valueConverters_js_1 = require("../valueConverters.js");
var RepositoryImplementation_js_1 = require("./RepositoryImplementation.js");
var validators_js_1 = require("../validators.js");
var relationInfoMember_js_1 = require("./relationInfoMember.js");
var remult_static_js_1 = require("../remult-static.js");
var addValidator_js_1 = require("./addValidator.js");
var isOfType_js_1 = require("../isOfType.js");
var inputTypes_js_1 = require("../../inputTypes.js");
var validateNumber = (0, validators_js_1.createValueValidator)(function (x) {
    return !isNaN(x) && isFinite(x);
});
var Fields = /** @class */ (function () {
    function Fields() {
    }
    /**
     * Stored as a JSON.stringify - to store as json use Fields.json
     */
    Fields.object = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        return Field.apply(void 0, tslib_1.__spreadArray([undefined], tslib_1.__read(options), false));
    };
    Fields.json = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        var op = options;
        if (op.valueConverter && !op.valueConverter.fieldTypeInDb)
            //@ts-ignore
            op.valueConverter.fieldTypeInDb = 'json';
        if (op.valueType && !op.valueType.inputType)
            //@ts-ignore
            op.valueType.inputType = inputTypes_js_1.InputTypes.json;
        return Field.apply(void 0, tslib_1.__spreadArray([undefined,
            {
                valueConverter: {
                    fieldTypeInDb: 'json',
                    inputType: inputTypes_js_1.InputTypes.json,
                },
            }], tslib_1.__read(options), false));
    };
    Fields.dateOnly = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        return Field.apply(void 0, tslib_1.__spreadArray([function () { return Date; },
            {
                valueConverter: valueConverters_js_1.ValueConverters.DateOnly,
            }], tslib_1.__read(options), false));
    };
    Fields.date = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        return Field.apply(void 0, tslib_1.__spreadArray([function () { return Date; }], tslib_1.__read(options), false));
    };
    Fields.integer = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        return Field.apply(void 0, tslib_1.__spreadArray([function () { return Number; },
            {
                valueConverter: valueConverters_js_1.ValueConverters.Integer,
                validate: validateNumber,
            }], tslib_1.__read(options), false));
    };
    Fields.autoIncrement = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        return Field.apply(void 0, tslib_1.__spreadArray([function () { return Number; },
            {
                allowApiUpdate: false,
                dbReadOnly: true,
                valueConverter: tslib_1.__assign(tslib_1.__assign({}, valueConverters_js_1.ValueConverters.Integer), { fieldTypeInDb: 'autoincrement' }),
            }], tslib_1.__read(options), false));
    };
    Fields.number = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        return Field.apply(void 0, tslib_1.__spreadArray([function () { return Number; },
            {
                validate: validateNumber,
            }], tslib_1.__read(options), false));
    };
    Fields.createdAt = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        return Field.apply(void 0, tslib_1.__spreadArray([function () { return Date; },
            {
                allowApiUpdate: false,
                saving: function (_, ref, _a) {
                    var isNew = _a.isNew;
                    if (isNew)
                        ref.value = new Date();
                },
            }], tslib_1.__read(options), false));
    };
    Fields.updatedAt = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        return Field.apply(void 0, tslib_1.__spreadArray([function () { return Date; },
            {
                allowApiUpdate: false,
                saving: function (_, ref) {
                    ref.value = new Date();
                },
            }], tslib_1.__read(options), false));
    };
    /** @deprecated use `@Fields.id()` instead */
    Fields.uuid = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        return Fields.id(tslib_1.__assign({ idFactory: function () { return crypto.randomUUID(); } }, options));
    };
    Object.defineProperty(Fields, "defaultIdFactory", {
        /**
         * ### cuid
         * @example
         * ```ts
         * import { Fields } from 'remult'
         * import { createId } from '@paralleldrive/cuid2'
         * Fields.defaultIdFactory = () => createId()
         * ```
         *
         * ### nanoid
         * @example
         * ```ts
         * import { Fields } from 'remult'
         * import { nanoid } from 'nanoid'
         * Fields.defaultIdFactory = () => nanoid()
         * ```
         *
         */
        get: function () {
            var _a;
            return ((_a = remult_static_js_1.remultStatic.defaultIdFactory) !== null && _a !== void 0 ? _a : (remult_static_js_1.remultStatic.defaultIdFactory = function () { return crypto.randomUUID(); }));
        },
        set: function (value) {
            remult_static_js_1.remultStatic.defaultIdFactory = value;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * ### Default
     * Defines a field that will be used as the id of the entity.
     * By default it will use `crypto.randomUUID` to generate the id.
     *
     * ---
     * ### Global `IdFactory`
     * You can change the algorithm used to generate the id by setting `Fields.defaultIdFactory`
     * globally. This code needs to be in a shared file to be accessible frontend and backend.
     *
     * ```ts
     * import { createId } from '@paralleldrive/cuid2'
     * Fields.defaultIdFactory = () => createId()
     * ```
     *
     * ---
     * ### Local `IdFactory`
     * You can also pass an `idFactory` as an option to the `@Fields.id` to have a different value on this field.
     * @example
     * ```ts
     * import { createId } from '@paralleldrive/cuid2'
     * // import { v4 as uuid } from 'uuid'
     * // import { nanoid } from 'nanoid'
     *
     * class MyEntity {
     *   \@Fields.id({
     *     idFactory: () => createId()
     *     // idFactory: () => uuid()
     *     // idFactory: () => nanoid()
     *   })
     *   id: string = '';
     * }
     * ```
     */
    Fields.id = function (options) {
        return Field(function () { return String; }, tslib_1.__assign({ allowApiUpdate: false, defaultValue: function () {
                var _a;
                var idFactory = (_a = options === null || options === void 0 ? void 0 : options.idFactory) !== null && _a !== void 0 ? _a : Fields.defaultIdFactory;
                return idFactory();
            }, saving: function (_, r) {
                var _a;
                if (!r.value) {
                    var idFactory = (_a = options === null || options === void 0 ? void 0 : options.idFactory) !== null && _a !== void 0 ? _a : Fields.defaultIdFactory;
                    r.value = idFactory();
                }
            } }, options));
    };
    /**
   * Defines a field that can hold a value from a specified set of string literals.
   * @param {() => readonly valueType[]} optionalValues - A function that returns an array of allowed string literals.
   * @returns {ClassFieldDecorator<entityType, valueType | undefined>} - A class field decorator.
   *
   * @example
   
   * class MyEntity {
   *   .@Fields.literal(() => ['open', 'closed', 'frozen', 'in progress'] as const)
   *   status: 'open' | 'closed' | 'frozen' | 'in progress' = 'open';
   * }
   
   *
   * // This defines a field `status` in `MyEntity` that can only hold the values 'open', 'closed', 'frozen', or 'in progress'.
   *
   * @example
   * // For better reusability and maintainability:
   
   * const statuses = ['open', 'closed', 'frozen', 'in progress'] as const;
   * type StatusType = typeof statuses[number];
   *
   * class MyEntity {
   *   .@Fields.literal(() => statuses)
   *   status: StatusType = 'open';
   * }
   
   *
   * // This approach allows easy management and updates of the allowed values for the `status` field.
   */
    Fields.literal = function (optionalValues) {
        var _a;
        var options = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            options[_i - 1] = arguments[_i];
        }
        return Fields.string.apply(Fields, tslib_1.__spreadArray([(_a = {
                    validate: function (entity, event) {
                        return validators_js_1.Validators.in(optionalValues())(entity, event);
                    }
                },
                //@ts-expect-error as we are adding this to options without it being defined in options
                _a[RepositoryImplementation_js_1.fieldOptionalValuesFunctionKey] = optionalValues,
                _a)], tslib_1.__read(options), false));
    };
    Fields.enum = function (enumType) {
        var _a;
        var options = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            options[_i - 1] = arguments[_i];
        }
        var valueConverter;
        return Field.apply(void 0, tslib_1.__spreadArray(tslib_1.__spreadArray([
            //@ts-ignore
            function () { return enumType(); }, (_a = {
                    validate: function (entity, event) {
                        return validators_js_1.Validators.enum(enumType())(entity, event);
                    }
                },
                _a[RepositoryImplementation_js_1.fieldOptionalValuesFunctionKey] = function () { return (0, validators_js_1.getEnumValues)(enumType()); },
                _a)], tslib_1.__read(options), false), [function (options) {
                ;
                options[RepositoryImplementation_js_1.fieldOptionalValuesFunctionKey] = function () {
                    return (0, validators_js_1.getEnumValues)(enumType());
                };
                if (valueConverter === undefined) {
                    var enumObj = enumType();
                    var enumValues = (0, validators_js_1.getEnumValues)(enumObj);
                    valueConverter = enumValues.find(function (x) { return typeof x === 'string'; })
                        ? valueConverters_js_1.ValueConverters.String
                        : valueConverters_js_1.ValueConverters.Integer;
                }
                if (!options.valueConverter) {
                    options.valueConverter = valueConverter;
                }
                else if (!options.valueConverter.fieldTypeInDb) {
                    //@ts-ignore
                    options.valueConverter.fieldTypeInDb = valueConverter.fieldTypeInDb;
                }
            }], false));
    };
    Fields.string = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        return Field.apply(void 0, tslib_1.__spreadArray([function () { return String; }], tslib_1.__read(options), false));
    };
    Fields.boolean = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        return Field.apply(void 0, tslib_1.__spreadArray([function () { return Boolean; }], tslib_1.__read(options), false));
    };
    return Fields;
}());
exports.Fields = Fields;
var Relations = /** @class */ (function () {
    function Relations() {
    }
    /**
     * Define a to-one relation between entities, indicating a one-to-one relationship.
     * If no field or fields are provided, it will automatically create a field in the database
     * to represent the relation.
     *
     * @param toEntityType A function that returns the target entity type.
     * @param options (Optional): An object containing options for configuring the to-one relation.
     * @returns A decorator function to apply the to-one relation to an entity field.
     *
     * Example usage:
     * ```ts
     * @Relations.toOne(() => Customer)
     * customer?: Customer;
     * ```
     * ```ts
     * Fields.string()
     * customerId?: string;
     *
     * @Relations.toOne(() => Customer, "customerId")
     * customer?: Customer;
     * ```
     * ```ts
     * Fields.string()
     * customerId?: string;
     *
     * @Relations.toOne(() => Customer, {
     *   field: "customerId",
     *   defaultIncluded: true
     * })
     * customer?: Customer;
     * ```
     * ```ts
     * Fields.string()
     * customerId?: string;
     *
     * @Relations.toOne(() => Customer, {
     *   fields: {
     *     customerId: "id",
     *   },
     * })
     * customer?: Customer;
     * ```
     */
    Relations.toOne = function (toEntityType, options) {
        var op = (typeof options === 'string'
            ? { field: options }
            : !options
                ? {}
                : options);
        if (!op.field && !op.fields && !op.findOptions)
            //@ts-ignore
            return Field(toEntityType, tslib_1.__assign(tslib_1.__assign({}, op), (0, relationInfoMember_js_1.relationInfoMemberInOptions)(toEntityType, 'reference')));
        return Field(function () { return undefined; }, tslib_1.__assign(tslib_1.__assign(tslib_1.__assign({}, op), { serverExpression: function () { return undefined; } }), (0, relationInfoMember_js_1.relationInfoMemberInOptions)(toEntityType, 'toOne')));
    };
    Relations.toMany = function (toEntityType, options) {
        var op = (typeof options === 'string'
            ? { field: options }
            : options);
        return Field(function () { return undefined; }, tslib_1.__assign(tslib_1.__assign(tslib_1.__assign({}, op), { serverExpression: function () { return undefined; } }), (0, relationInfoMember_js_1.relationInfoMemberInOptions)(toEntityType, 'toMany')));
    };
    return Relations;
}());
exports.Relations = Relations;
/**Decorates fields that should be used as fields.
 * for more info see: [Field Types](https://remult.dev/docs/field-types.html)
 *
 * FieldOptions can be set in two ways:
 * @example
 * // as an object
 * @Fields.string({ includeInApi:false })
 * title='';
 * @example
 * // as an arrow function that receives `remult` as a parameter
 * @Fields.string((options,remult) => options.includeInApi = true)
 * title='';
 */
function Field(valueType) {
    // import ANT!!!! if you call this in another decorator, make sure to set It's return type correctly with the | undefined
    var options = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        options[_i - 1] = arguments[_i];
    }
    return function (target, context, c) {
        var key = typeof context === 'string' ? context : context.name.toString();
        var factory = function (remult) {
            var r = (0, RepositoryImplementation_js_1.buildOptions)(options, remult);
            if (r.required) {
                r.validate = (0, addValidator_js_1.addValidator)(r.validate, validators_js_1.Validators.required, true);
            }
            if ((0, isOfType_js_1.isOfType)(r, 'maxLength')) {
                var z = r;
                if (z.maxLength) {
                    z.validate = (0, addValidator_js_1.addValidator)(z.validate, validators_js_1.Validators.maxLength(z.maxLength));
                }
            }
            if ((0, isOfType_js_1.isOfType)(r, 'minLength')) {
                var z = r;
                if (z.minLength) {
                    z.validate = (0, addValidator_js_1.addValidator)(z.validate, validators_js_1.Validators.minLength(z.minLength));
                }
            }
            if (!r.valueType && valueType) {
                r.valueType = valueType();
            }
            if (!r.key) {
                r.key = key;
            }
            if (!r.dbName)
                r.dbName = r.key;
            var type = r.valueType;
            if (!type) {
                // removing import 'reflect-metadata' from server-action.ts, so we return an empty array
                type = undefined;
                // type =
                //   typeof Reflect.getMetadata == 'function'
                //     ? Reflect.getMetadata('design:type', target, key)
                //     : []
                r.valueType = type;
            }
            if (!r.target)
                r.target = target;
            return r;
        };
        checkTarget(target);
        var names = remult_static_js_1.remultStatic.columnsOfType.get(target.constructor);
        if (!names) {
            names = [];
            remult_static_js_1.remultStatic.columnsOfType.set(target.constructor, names);
        }
        var set = names.find(function (x) { return x.key == key; });
        if (!set)
            names.push({
                key: key,
                settings: factory,
            });
        else {
            var prev_1 = set.settings;
            set.settings = function (c) {
                var prevO = prev_1(c);
                var curr = factory(c);
                return Object.assign(prevO, curr);
            };
        }
    };
}
function checkTarget(target) {
    if (!target)
        throw new Error("Set the 'experimentalDecorators:true' option in your 'tsconfig' or 'jsconfig' (target undefined)");
}
