class CompoundIdField {
    fields;
    constructor(...columns) {
        this.fields = columns;
    }
    apiUpdateAllowed(item) {
        throw new Error('Method not implemented.');
    }
    displayValue(item) {
        throw new Error('Method not implemented.');
    }
    includedInApi(item) {
        throw new Error('Method not implemented.');
    }
    toInput(value, inputType) {
        throw new Error('Method not implemented.');
    }
    fromInput(inputValue, inputType) {
        throw new Error('Method not implemented.');
    }
    getDbName() {
        return Promise.resolve('');
    }
    getId(instance) {
        let get = (field) => {
            return instance[field.key];
        };
        if (typeof instance === 'function') {
            get = instance;
        }
        let r = '';
        this.fields.forEach((c) => {
            if (r.length > 0)
                r += ',';
            r += c.valueConverter.toJson(get(c));
        });
        return r;
    }
    options = {};
    get valueConverter() {
        throw new Error('cant get value converter of compound id');
    }
    target;
    readonly = true;
    allowNull = false;
    dbReadOnly = false;
    isServerExpression = false;
    key = '';
    label = '';
    caption = '';
    inputType = '';
    dbName = '';
    valueType;
    isEqualTo(value) {
        let result = {};
        let val = value.toString();
        let id = val.split(',');
        this.fields.forEach((c, i) => {
            result[c.key] = c.valueConverter.fromJson(id[i]);
        });
        return result;
    }
}

/**
 * Retrieves the EntityRef object associated with the specified entity instance.
 * The EntityRef provides methods for performing operations on the entity instance.
 * @param {entityType} entity - The entity instance.
 * @param {boolean} [throwException=true] - Indicates whether to throw an exception if the EntityRef object cannot be retrieved.
 * @returns {EntityRef<entityType>} The EntityRef object associated with the specified entity instance.
 * @throws {Error} If throwException is true and the EntityRef object cannot be retrieved.
 * @see [Active Record & EntityBase](https://remult.dev/docs/active-record)
 */
function getEntityRef(entity, throwException = true) {
    if (entity === undefined)
        throw new Error('entity is undefined');
    let x = entity[entityMember];
    if (!x && throwException)
        throw new Error('item ' +
            (entity.constructor?.name || entity) +
            ' was not initialized using a context');
    return x;
}
const entityMember = Symbol.for('entityMember');
const entityInfo = Symbol.for('entityInfo');
const entityInfo_key = Symbol.for('entityInfo_key');
function getEntitySettings(entity, throwError = true) {
    if (entity === undefined)
        if (throwError) {
            throw new Error('Undefined is not an entity :)');
        }
        else
            return undefined;
    let info = entity[entityInfo];
    if (!info && throwError)
        throw new Error(entity.prototype.constructor.name +
            " is not a known entity, did you forget to set @Entity() or did you forget to add the '@' before the call to Entity?");
    return info;
}
function getEntityKey(entity) {
    return entity[entityInfo_key];
}

const relationInfoMember = Symbol.for('relationInfo');
/**
 * @deprecated
 */
function getRelationInfo(options) {
    return options?.[relationInfoMember];
}
const fieldRelationInfo = Symbol.for('fieldRelationInfo');
function getRelationFieldInfo(field) {
    if (!field)
        return undefined;
    return field[fieldRelationInfo];
}
function verifyFieldRelationInfo(repo, remult, dp) {
    for (const field of repo.fields.toArray()) {
        const r = getRelationInfo(field.options);
        if (r) {
            if (!field[fieldRelationInfo]) {
                const toEntity = r.toType();
                const toRepo = remult.repo(toEntity, dp);
                const options = field.options;
                field[fieldRelationInfo] = {
                    type: r.type,
                    toEntity,
                    options,
                    toRepo,
                    getFields: () => {
                        let relationField = options.field;
                        let relFields = {
                            fields: options.fields,
                            compoundIdField: undefined,
                        };
                        function buildError(what) {
                            return Error(`Error for relation: "${repo.metadata.key}.${field.key}", ` +
                                what);
                        }
                        let hasFields = () => relationField || relFields.fields;
                        if (r.type === 'toMany' && !hasFields()) {
                            for (const fieldInOtherRepo of toRepo.fields.toArray()) {
                                if (!hasFields()) {
                                    const reverseRel = getRelationFieldInfo(fieldInOtherRepo);
                                    const relOp = fieldInOtherRepo.options;
                                    if (reverseRel)
                                        if (reverseRel.toEntity === repo.metadata.entityType)
                                            if (reverseRel.type === 'reference') {
                                                relationField = fieldInOtherRepo.key;
                                            }
                                            else if (reverseRel.type === 'toOne') {
                                                if (relOp.field) {
                                                    relationField = relOp.field;
                                                }
                                                else if (relOp.fields) {
                                                    let fields = {};
                                                    for (const key in relOp.fields) {
                                                        if (Object.prototype.hasOwnProperty.call(relOp.fields, key)) {
                                                            const keyInMyTable = relOp.fields[key];
                                                            fields[keyInMyTable] = key;
                                                        }
                                                    }
                                                    relFields.fields = fields;
                                                }
                                            }
                                }
                            }
                            if (!hasFields())
                                throw buildError(`No matching field found on target "${toRepo.metadata.key}". Please specify field/fields`);
                        }
                        function requireField(field, meta) {
                            const result = meta.fields.find(field);
                            if (!result)
                                throw buildError(`Field "${field}" was not found in "${meta.key}".`);
                            return result;
                        }
                        if (r.type === 'reference') {
                            relationField = field.key;
                        }
                        if (relationField) {
                            if (r.type === 'toOne' || r.type === 'reference') {
                                if (toRepo.metadata.idMetadata.field instanceof CompoundIdField) {
                                    relFields.compoundIdField = relationField;
                                }
                                else
                                    relFields.fields = {
                                        [toRepo.metadata.idMetadata.field.key]: relationField,
                                    };
                            }
                            else {
                                if (repo.metadata.idMetadata.field instanceof CompoundIdField) {
                                    relFields.compoundIdField = relationField;
                                }
                                else
                                    relFields.fields = {
                                        [relationField]: repo.metadata.idMetadata.field.key,
                                    };
                            }
                        }
                        for (const key in relFields.fields) {
                            if (Object.prototype.hasOwnProperty.call(relFields.fields, key)) {
                                requireField(key, toRepo.metadata);
                                requireField(relFields.fields[key], repo.metadata);
                            }
                        }
                        return relFields;
                    },
                };
            }
        }
    }
}

/**
 * The `Filter` class is a helper class that focuses on filter-related concerns. It provides methods
 * for creating and applying filters in queries.
 */
class Filter {
    apply;
    //@internal
    static throwErrorIfFilterIsEmpty(where, methodName) {
        if (Filter.isFilterEmpty(where)) {
            throw {
                message: `${methodName}: requires a filter to protect against accidental delete/update of all rows`,
                httpStatusCode: 400,
            };
        }
    }
    //@internal
    static isFilterEmpty(where) {
        if (where.$and) {
            for (const a of where.$and) {
                if (!Filter.isFilterEmpty(a)) {
                    return false;
                }
            }
        }
        if (where.$or) {
            for (const a of where.$or) {
                if (Filter.isFilterEmpty(a)) {
                    return true;
                }
            }
            return false;
        }
        if (Object.keys(where).filter((x) => !['$or', '$and'].includes(x)).length == 0) {
            return true;
        }
        return false;
    }
    /**
     * Retrieves precise values for each property in a filter for an entity.
     * @template entityType The type of the entity being filtered.
     * @param metadata The metadata of the entity being filtered.
     * @param filter The filter to analyze.
     * @returns A promise that resolves to a FilterPreciseValues object containing the precise values for each property.
     * @example
     * const preciseValues = await Filter.getPreciseValues(meta, {
     *   status: { $ne: 'active' },
     *   $or: [
     *     { customerId: ["1", "2"] },
     *     { customerId: "3" }
     *   ]
     * });
     * console.log(preciseValues);
     * // Output:
     * // {
     * //   "customerId": ["1", "2", "3"], // Precise values inferred from the filter
     * //   "status": undefined,           // Cannot infer precise values for 'status'
     * // }
    
     */
    static async getPreciseValues(metadata, filter) {
        const result = new preciseValuesCollector();
        await Filter.fromEntityFilter(metadata, filter).__applyToConsumer(result);
        return result.preciseValues;
    }
    /**
     * Retrieves precise values for each property in a filter for an entity.
     * @template entityType The type of the entity being filtered.
     * @param metadata The metadata of the entity being filtered.
     * @param filter The filter to analyze.
     * @returns A promise that resolves to a FilterPreciseValues object containing the precise values for each property.
     * @example
     * const preciseValues = await where.getPreciseValues();
     * console.log(preciseValues);
     * // Output:
     * // {
     * //   "customerId": ["1", "2", "3"], // Precise values inferred from the filter
     * //   "status": undefined,           // Cannot infer precise values for 'status'
     * // }
    
     */
    async getPreciseValues() {
        const result = new preciseValuesCollector();
        await this.__applyToConsumer(result);
        return result.preciseValues;
    }
    static createCustom(translator, key = '') {
        let rawFilterInfo = { key: key, rawFilterTranslator: translator };
        return Object.assign((x) => {
            if (x == undefined)
                x = {};
            if (!rawFilterInfo.key)
                throw 'Usage of custom filter before a key was assigned to it';
            return {
                [customUrlToken + rawFilterInfo.key]: x,
            };
        }, { rawFilterInfo });
    }
    /**
     * Translates an `EntityFilter` to a plain JSON object that can be stored or transported.
     *
     * @template T The entity type for the filter.
     * @param {EntityMetadata<T>} entityDefs The metadata of the entity associated with the filter.
     * @param {EntityFilter<T>} where The `EntityFilter` to be translated.
     * @returns {any} A plain JSON object representing the `EntityFilter`.
     *
     * @example
     * // Assuming `Task` is an entity class
     * const jsonFilter = Filter.entityFilterToJson(Task, { completed: true });
     * // `jsonFilter` can now be stored or transported as JSON
     */
    static entityFilterToJson(entityDefs, where) {
        return Filter.fromEntityFilter(entityDefs, where).toJson();
    }
    /**
     * Translates a plain JSON object back into an `EntityFilter`.
     *
     * @template T The entity type for the filter.
     * @param {EntityMetadata<T>} entityDefs The metadata of the entity associated with the filter.
     * @param {any} packed The plain JSON object representing the `EntityFilter`.
     * @returns {EntityFilter<T>} The reconstructed `EntityFilter`.
     *
     * @example
     * // Assuming `Task` is an entity class and `jsonFilter` is a JSON object representing an EntityFilter
     * const taskFilter = Filter.entityFilterFromJson(Task, jsonFilter);
     * // Using the reconstructed `EntityFilter` in a query
     * const tasks = await remult.repo(Task).find({ where: taskFilter });
     * for (const task of tasks) {
     *   // Do something for each task based on the filter
     * }
     */
    static entityFilterFromJson(entityDefs, packed) {
        return buildFilterFromRequestParameters(entityDefs, {
            get: (key) => packed[key],
        });
    }
    /**
     * Converts an `EntityFilter` to a `Filter` that can be used by the `DataProvider`. This method is
     * mainly used internally.
     *
     * @template T The entity type for the filter.
     * @param {EntityMetadata<T>} entity The metadata of the entity associated with the filter.
     * @param {EntityFilter<T>} whereItem The `EntityFilter` to be converted.
     * @returns {Filter} A `Filter` instance that can be used by the `DataProvider`.
     *
     * @example
     * // Assuming `Task` is an entity class and `taskFilter` is an EntityFilter
     * const filter = Filter.fromEntityFilter(Task, taskFilter);
     * // `filter` can now be used with the DataProvider
     */
    static fromEntityFilter(entity, whereItem) {
        let result = [];
        for (const key in whereItem) {
            if (Object.prototype.hasOwnProperty.call(whereItem, key)) {
                let fieldToFilter = whereItem[key];
                {
                    if (key == '$or') {
                        result.push(new OrFilter(...fieldToFilter.map((x) => Filter.fromEntityFilter(entity, x))));
                    }
                    else if (key == '$not') {
                        result.push(new NotFilter(Filter.fromEntityFilter(entity, fieldToFilter)));
                    }
                    else if (key == '$and') {
                        result.push(new AndFilter(...fieldToFilter.map((x) => Filter.fromEntityFilter(entity, x))));
                    }
                    else if (key.startsWith(customUrlToken)) {
                        result.push(new Filter((x) => {
                            x.custom(key.substring(customUrlToken.length), fieldToFilter);
                        }));
                    }
                    else if (key == customDatabaseFilterToken) {
                        result.push(new Filter((x) => x.databaseCustom(fieldToFilter)));
                    }
                    else {
                        const field = entity.fields[key];
                        if (!field)
                            throw new Error(`Field ${key} not found in entity ${entity.key}`);
                        const rel = getRelationFieldInfo(field);
                        const op = field.options;
                        let fh = rel?.type === 'toOne'
                            ? op.fields
                                ? new manyToOneFilterHelper(field, entity.fields, op)
                                : new toOneFilterHelper(entity.fields[op.field])
                            : new filterHelper(field);
                        let found = false;
                        if (fieldToFilter !== undefined && fieldToFilter != null) {
                            if (fieldToFilter.$id !== undefined)
                                fieldToFilter = fieldToFilter.$id;
                            for (const key in fieldToFilter) {
                                if (Object.prototype.hasOwnProperty.call(fieldToFilter, key)) {
                                    const element = fieldToFilter[key];
                                    switch (key) {
                                        case '$gte':
                                        case '>=':
                                            result.push(fh.isGreaterOrEqualTo(element));
                                            found = true;
                                            break;
                                        case '$gt':
                                        case '>':
                                            result.push(fh.isGreaterThan(element));
                                            found = true;
                                            break;
                                        case '$lte':
                                        case '<=':
                                            result.push(fh.isLessOrEqualTo(element));
                                            found = true;
                                            break;
                                        case '$lt':
                                        case '<':
                                            result.push(fh.isLessThan(element));
                                            found = true;
                                            break;
                                        case '$ne':
                                        case '$not':
                                        case '!=':
                                        case '$nin':
                                            found = true;
                                            if (Array.isArray(element)) {
                                                result.push(fh.isNotIn(element));
                                            }
                                            else
                                                result.push(fh.isDifferentFrom(element));
                                            break;
                                        case '$in':
                                            found = true;
                                            result.push(fh.isIn(element));
                                            break;
                                        case '$contains':
                                            found = true;
                                            result.push(fh.contains(element));
                                            break;
                                        case '$startsWith':
                                            found = true;
                                            result.push(fh.startsWith(element));
                                            break;
                                        case '$endsWith':
                                            found = true;
                                            result.push(fh.endsWith(element));
                                            break;
                                        case '$notContains':
                                            found = true;
                                            result.push(fh.notContains(element));
                                            break;
                                    }
                                }
                            }
                            if (Array.isArray(fieldToFilter)) {
                                found = true;
                                result.push(fh.isIn(fieldToFilter));
                            }
                        }
                        if (!found && fieldToFilter !== undefined) {
                            result.push(fh.isEqualTo(fieldToFilter));
                        }
                    }
                }
            }
        }
        return new AndFilter(...result);
    }
    constructor(apply) {
        this.apply = apply;
    }
    __applyToConsumer(add) {
        this.apply(add);
    }
    /**
     * Resolves an entity filter.
     *
     * This method takes a filter which can be either an instance of `EntityFilter`
     * or a function that returns an instance of `EntityFilter` or a promise that
     * resolves to an instance of `EntityFilter`. It then resolves the filter if it
     * is a function and returns the resulting `EntityFilter`.
     *
     * @template entityType The type of the entity that the filter applies to.
     * @param {EntityFilter<entityType> | (() => EntityFilter<entityType> | Promise<EntityFilter<entityType>>)} filter The filter to resolve.
     * @returns {Promise<EntityFilter<entityType>>} The resolved entity filter.
     */
    static async resolve(filter) {
        if (typeof filter === 'function')
            return await filter();
        return filter;
    }
    toJson() {
        let r = new FilterSerializer();
        this.__applyToConsumer(r);
        return r.result;
    }
    static async translateCustomWhere(r, entity, remult) {
        // Used in hagai
        let f = new customTranslator(async (filterKey, custom) => {
            let r = [];
            for (const key in entity.entityType) {
                const element = entity.entityType[key];
                if (element &&
                    element.rawFilterInfo &&
                    element.rawFilterInfo.rawFilterTranslator) {
                    if (element.rawFilterInfo.key == filterKey) {
                        r.push(await Filter.fromEntityFilter(entity, await element.rawFilterInfo.rawFilterTranslator(custom, remult)));
                    }
                }
            }
            return r;
        });
        r.__applyToConsumer(f);
        await f.resolve();
        r = new Filter((x) => f.applyTo(x));
        return r;
    }
}
class filterHelper {
    metadata;
    constructor(metadata) {
        this.metadata = metadata;
    }
    processVal(val) {
        let ei = getEntitySettings(this.metadata.valueType, false);
        if (ei) {
            if (val === undefined || val === null) {
                if (val === null && !this.metadata.allowNull) {
                    const rel = getRelationFieldInfo(this.metadata);
                    if (rel?.type === 'reference')
                        if (rel.toRepo.metadata.idMetadata.field.options.valueType === Number)
                            return 0;
                        else
                            return '';
                }
                return null;
            }
            if (typeof val === 'string' || typeof val === 'number')
                return val;
            return getEntityRef(val).getId();
        }
        return val;
    }
    contains(val) {
        return new Filter((add) => add.containsCaseInsensitive(this.metadata, val));
    }
    notContains(val) {
        return new Filter((add) => add.notContainsCaseInsensitive(this.metadata, val));
    }
    startsWith(val) {
        return new Filter((add) => add.startsWithCaseInsensitive(this.metadata, val));
    }
    endsWith(val) {
        return new Filter((add) => add.endsWithCaseInsensitive(this.metadata, val));
    }
    isLessThan(val) {
        val = this.processVal(val);
        return new Filter((add) => add.isLessThan(this.metadata, val));
    }
    isGreaterOrEqualTo(val) {
        val = this.processVal(val);
        return new Filter((add) => add.isGreaterOrEqualTo(this.metadata, val));
    }
    isNotIn(values) {
        return new Filter((add) => {
            for (const v of values) {
                add.isDifferentFrom(this.metadata, this.processVal(v));
            }
        });
    }
    isDifferentFrom(val) {
        val = this.processVal(val);
        if ((val === null || val === undefined) && this.metadata.allowNull)
            return new Filter((add) => add.isNotNull(this.metadata));
        return new Filter((add) => add.isDifferentFrom(this.metadata, val));
    }
    isLessOrEqualTo(val) {
        val = this.processVal(val);
        return new Filter((add) => add.isLessOrEqualTo(this.metadata, val));
    }
    isGreaterThan(val) {
        val = this.processVal(val);
        return new Filter((add) => add.isGreaterThan(this.metadata, val));
    }
    isEqualTo(val) {
        val = this.processVal(val);
        if ((val === null || val === undefined) && this.metadata.allowNull)
            return new Filter((add) => add.isNull(this.metadata));
        return new Filter((add) => add.isEqualTo(this.metadata, val));
    }
    isIn(val) {
        val = val.map((x) => this.processVal(x));
        if (val?.length == 1 && val[0] != undefined && val[0] !== null)
            return new Filter((add) => add.isEqualTo(this.metadata, val[0]));
        return new Filter((add) => add.isIn(this.metadata, val));
    }
}
class toOneFilterHelper extends filterHelper {
    processVal(val) {
        if (!val)
            return null;
        if (typeof val === 'string' || typeof val === 'number')
            return val;
        return getEntityRef(val).getId();
    }
}
class manyToOneFilterHelper {
    metadata;
    fields;
    relationOptions;
    constructor(metadata, fields, relationOptions) {
        this.metadata = metadata;
        this.fields = fields;
        this.relationOptions = relationOptions;
    }
    processVal(val) {
        throw new Error('Invalid for Many To One Relation Field');
    }
    contains(val) {
        throw new Error('Invalid for Many To One Relation Field');
    }
    notContains(val) {
        throw new Error('Invalid for Many To One Relation Field');
    }
    endsWith(val) {
        throw new Error('Invalid for Many To One Relation Field');
    }
    startsWith(val) {
        throw new Error('Invalid for Many To One Relation Field');
    }
    isLessThan(val) {
        throw new Error('Invalid for Many To One Relation Field');
    }
    isGreaterOrEqualTo(val) {
        throw new Error('Invalid for Many To One Relation Field');
    }
    isNotIn(values) {
        return new Filter((add) => {
            values.forEach((v) => this.isDifferentFrom(v).__applyToConsumer(add));
        });
    }
    isDifferentFrom(val) {
        return new Filter((add) => {
            const or = [];
            for (const key in this.relationOptions.fields) {
                if (Object.prototype.hasOwnProperty.call(this.relationOptions.fields, key)) {
                    const keyInMyEntity = this.relationOptions.fields[key];
                    or.push(new Filter((add) => new filterHelper(this.fields.find(keyInMyEntity))
                        .isDifferentFrom(val[key])
                        .__applyToConsumer(add)));
                }
            }
            add.or(or);
        });
    }
    isLessOrEqualTo(val) {
        throw new Error('Invalid for Many To One Relation Field');
    }
    isGreaterThan(val) {
        throw new Error('Invalid for Many To One Relation Field');
    }
    isEqualTo(val) {
        return new Filter((add) => {
            for (const key in this.relationOptions.fields) {
                if (Object.prototype.hasOwnProperty.call(this.relationOptions.fields, key)) {
                    const keyInMyEntity = this.relationOptions.fields[key];
                    new filterHelper(this.fields.find(keyInMyEntity))
                        .isEqualTo(val[key])
                        .__applyToConsumer(add);
                }
            }
        });
    }
    isIn(val) {
        return new Filter((add) => {
            add.or(val.map((v) => this.isEqualTo(v)));
        });
    }
}
class AndFilter extends Filter {
    filters;
    constructor(...filters) {
        super((add) => {
            for (const iterator of this.filters) {
                if (iterator)
                    iterator.__applyToConsumer(add);
            }
        });
        this.filters = filters;
    }
    add(filter) {
        this.filters.push(filter);
    }
}
class OrFilter extends Filter {
    filters;
    constructor(...filters) {
        super((add) => {
            let f = this.filters.filter((x) => x !== undefined);
            if (f.length > 1) {
                add.or(f);
            }
            else if (f.length == 1)
                f[0].__applyToConsumer(add);
        });
        this.filters = filters;
    }
}
class NotFilter extends Filter {
    filter;
    constructor(filter) {
        super((add) => {
            add.not(filter);
        });
        this.filter = filter;
    }
}
const customUrlToken = '$custom$';
const customDatabaseFilterToken = '$db$';
const customArrayToken = '$an array';
class FilterSerializer {
    result = {};
    constructor() { }
    databaseCustom(databaseCustom) {
        throw new Error('database custom is not allowed with api calls.');
    }
    custom(key, customItem) {
        if (Array.isArray(customItem))
            customItem = { [customArrayToken]: customItem };
        this.add(customUrlToken + key, customItem);
    }
    hasUndefined = false;
    add(key, val) {
        if (val === undefined)
            this.hasUndefined = true;
        let r = this.result;
        if (r[key] === undefined) {
            r[key] = val;
            return;
        }
        let v = r[key];
        if (v instanceof Array) {
            v.push(val);
        }
        else
            v = [v, val];
        r[key] = v;
    }
    or(orElements) {
        this.add('OR', orElements.map((x) => {
            let f = new FilterSerializer();
            x.__applyToConsumer(f);
            return f.result;
        }));
    }
    not(filter) {
        let f = new FilterSerializer();
        filter.__applyToConsumer(f);
        this.add('NOT', f.result);
    }
    isNull(col) {
        this.add(col.key + '.null', true);
    }
    isNotNull(col) {
        this.add(col.key + '.null', false);
    }
    isIn(col, val) {
        this.add(col.key + '.in', val.map((x) => col.valueConverter.toJson(x)));
    }
    isEqualTo(col, val) {
        this.add(col.key, col.valueConverter.toJson(val));
    }
    isDifferentFrom(col, val) {
        this.add(col.key + '.ne', col.valueConverter.toJson(val));
    }
    isGreaterOrEqualTo(col, val) {
        this.add(col.key + '.gte', col.valueConverter.toJson(val));
    }
    isGreaterThan(col, val) {
        this.add(col.key + '.gt', col.valueConverter.toJson(val));
    }
    isLessOrEqualTo(col, val) {
        this.add(col.key + '.lte', col.valueConverter.toJson(val));
    }
    isLessThan(col, val) {
        this.add(col.key + '.lt', col.valueConverter.toJson(val));
    }
    containsCaseInsensitive(col, val) {
        this.add(col.key + '.contains', val);
    }
    notContainsCaseInsensitive(col, val) {
        this.add(col.key + '.notContains', val);
    }
    startsWithCaseInsensitive(col, val) {
        this.add(col.key + '.startsWith', val);
    }
    endsWithCaseInsensitive(col, val) {
        this.add(col.key + '.endsWith', val);
    }
}
function buildFilterFromRequestParameters(entity, filterInfo) {
    let where = {};
    function addAnd(what) {
        if (!where.$and) {
            where.$and = [];
        }
        where.$and.push(what);
    }
    function addToFilterObject(key, val) {
        if (where[key] === undefined)
            where[key] = val;
        else {
            addAnd({ [key]: val });
        }
    }
    [...entity.fields].forEach((col) => {
        function addFilter(operation, theFilter, jsonArray = false, asString = false) {
            let val = filterInfo.get(col.key + operation);
            if (val !== undefined) {
                let addFilter = (val) => {
                    let theVal = val;
                    if (jsonArray) {
                        let arr;
                        if (typeof val === 'string')
                            arr = JSON.parse(val);
                        else
                            arr = val;
                        theVal = arr.map((x) => asString ? x : col.valueConverter.fromJson(x));
                    }
                    else {
                        theVal = asString ? theVal : col.valueConverter.fromJson(theVal);
                    }
                    let f = theFilter(theVal);
                    if (f !== undefined) {
                        addToFilterObject(col.key, f);
                    }
                };
                if (!jsonArray && val instanceof Array) {
                    val.forEach((v) => {
                        addFilter(v);
                    });
                }
                else {
                    if (jsonArray) {
                        if (typeof val === 'string')
                            val = JSON.parse(val);
                    }
                    const array = separateArrayFromInnerArray(val);
                    for (const x of array) {
                        addFilter(x);
                    }
                }
            }
        }
        addFilter('', (val) => val);
        addFilter('.gt', (val) => ({ $gt: val }));
        addFilter('.gte', (val) => ({ $gte: val }));
        addFilter('.lt', (val) => ({ $lt: val }));
        addFilter('.lte', (val) => ({ $lte: val }));
        addFilter('.ne', (val) => ({ $ne: val }));
        addFilter('.in', (val) => val, true);
        var nullFilter = filterInfo.get(col.key + '.null');
        if (nullFilter) {
            nullFilter = nullFilter.toString().trim().toLowerCase();
            switch (nullFilter) {
                case 'y':
                case 'true':
                case 'yes':
                    addToFilterObject(col.key, null);
                    break;
                default:
                    addToFilterObject(col.key, { $ne: null });
                    break;
            }
        }
        addFilter('.contains', (val) => ({ $contains: val }), false, true);
        addFilter('.notContains', (val) => ({ $notContains: val }), false, true);
        addFilter('.startsWith', (val) => ({ $startsWith: val }), false, true);
        addFilter('.endsWith', (val) => ({ $endsWith: val }), false, true);
    });
    let val = filterInfo.get('OR');
    if (val) {
        const array = separateArrayFromInnerArray(val);
        const or = array.map((v) => ({
            $or: v.map((x) => buildFilterFromRequestParameters(entity, {
                get: (key) => x[key],
            })),
        }));
        if (or.length == 1) {
            if (!where.$or) {
                where.$or = or[0].$or;
            }
            else {
                where.$or.push(or[0].$or);
            }
        }
        else {
            addAnd({
                $and: or,
            });
        }
    }
    val = filterInfo.get('NOT');
    if (val) {
        let array = separateArrayFromInnerArray(val);
        const not = [];
        for (const e1 of array) {
            if (Array.isArray(e1)) {
                for (const e2 of e1) {
                    not.push({
                        $not: buildFilterFromRequestParameters(entity, {
                            get: (key) => e2[key],
                        }),
                    });
                }
            }
            else
                not.push({
                    $not: buildFilterFromRequestParameters(entity, {
                        get: (key) => e1[key],
                    }),
                });
        }
        if (not.length == 1) {
            if (!where.$not) {
                where.$not = not[0].$not;
            }
            else {
                where.$not.push(not[0].$not);
            }
        }
        else {
            addAnd({
                $and: not,
            });
        }
    }
    for (const key in entity.entityType) {
        const element = entity.entityType[key];
        if (element &&
            element.rawFilterInfo &&
            element.rawFilterInfo.rawFilterTranslator) {
            let custom = filterInfo.get(customUrlToken + key);
            if (custom !== undefined) {
                const addItem = (item) => {
                    if (item[customArrayToken] != undefined)
                        item = item[customArrayToken];
                    addToFilterObject(customUrlToken + key, item);
                };
                if (Array.isArray(custom)) {
                    custom.forEach((item) => addItem(item));
                }
                else
                    addItem(custom);
            }
        }
    }
    return where;
    function separateArrayFromInnerArray(val) {
        if (!Array.isArray(val))
            return [val];
        const nonArray = [], array = [];
        for (const v of val) {
            if (Array.isArray(v)) {
                array.push(v);
            }
            else
                nonArray.push(v);
        }
        array.push(nonArray);
        return array;
    }
}
class customTranslator {
    translateCustom;
    applyTo(x) {
        this.commands.forEach((y) => y(x));
    }
    constructor(translateCustom) {
        this.translateCustom = translateCustom;
    }
    commands = [];
    promises = [];
    or(orElements) {
        let newOrElements;
        this.promises.push(Promise.all(orElements.map(async (element) => {
            let c = new customTranslator(this.translateCustom);
            element.__applyToConsumer(c);
            await c.resolve();
            return new Filter((x) => c.applyTo(x));
        })).then((x) => {
            newOrElements = x;
        }));
        this.commands.push((x) => x.or(newOrElements));
    }
    not(filter) {
        let newNotElement;
        this.promises.push((async () => {
            let c = new customTranslator(this.translateCustom);
            filter.__applyToConsumer(c);
            await c.resolve();
            newNotElement = new Filter((x) => c.applyTo(x));
        })());
        this.commands.push((x) => x.not(newNotElement));
    }
    isEqualTo(col, val) {
        this.commands.push((x) => x.isEqualTo(col, val));
    }
    isDifferentFrom(col, val) {
        this.commands.push((x) => x.isDifferentFrom(col, val));
    }
    isNull(col) {
        this.commands.push((x) => x.isNull(col));
    }
    isNotNull(col) {
        this.commands.push((x) => x.isNotNull(col));
    }
    isGreaterOrEqualTo(col, val) {
        this.commands.push((x) => x.isGreaterOrEqualTo(col, val));
    }
    isGreaterThan(col, val) {
        this.commands.push((x) => x.isGreaterThan(col, val));
    }
    isLessOrEqualTo(col, val) {
        this.commands.push((x) => x.isLessOrEqualTo(col, val));
    }
    isLessThan(col, val) {
        this.commands.push((x) => x.isLessThan(col, val));
    }
    containsCaseInsensitive(col, val) {
        this.commands.push((x) => x.containsCaseInsensitive(col, val));
    }
    notContainsCaseInsensitive(col, val) {
        this.commands.push((x) => x.notContainsCaseInsensitive(col, val));
    }
    startsWithCaseInsensitive(col, val) {
        this.commands.push((x) => x.startsWithCaseInsensitive(col, val));
    }
    endsWithCaseInsensitive(col, val) {
        this.commands.push((x) => x.endsWithCaseInsensitive(col, val));
    }
    isIn(col, val) {
        this.commands.push((x) => x.isIn(col, val));
    }
    custom(key, customItem) {
        this.promises.push((async () => {
            let r = await this.translateCustom(key, customItem);
            if (r)
                if (Array.isArray(r))
                    r.forEach((x) => x.__applyToConsumer(this));
                else
                    r.__applyToConsumer(this);
        })());
    }
    databaseCustom(custom) {
        this.commands.push((x) => x.databaseCustom(custom));
    }
    async resolve() {
        while (this.promises.length > 0) {
            let p = this.promises;
            this.promises = [];
            await Promise.all(p);
        }
    }
}
class preciseValuesCollector {
    rawValues = {};
    preciseValues = new Proxy(this.rawValues, {
        get: (target, prop) => {
            if (prop in target) {
                let result = target[prop];
                if (result.bad)
                    return undefined;
                if (result.values.length > 0) {
                    const relInfo = getRelationFieldInfo(result.field);
                    if (relInfo) {
                        if (relInfo.type === 'reference') {
                            return result.values.map((x) => {
                                return relInfo.toRepo.metadata.idMetadata.getIdFilter(x);
                            });
                        }
                        else
                            throw new Error('Only relations toOne without field are supported.');
                    }
                    return result.values;
                }
            }
            return undefined;
        },
    });
    ok(col, ...val) {
        let x = this.rawValues[col.key];
        if (!x) {
            this.rawValues[col.key] = {
                field: col,
                bad: false,
                values: [...val],
            };
        }
        else {
            x.values.push(...val.filter((y) => !x.values.includes(y)));
        }
    }
    notOk(col) {
        let x = this.rawValues[col.key];
        if (!x) {
            this.rawValues[col.key] = {
                field: col,
                bad: true,
                values: [],
            };
        }
        else {
            x.bad = true;
        }
    }
    not(filter) { }
    or(orElements) {
        const result = orElements.map((or) => {
            let x = new preciseValuesCollector();
            or.__applyToConsumer(x);
            return x;
        });
        for (const or of result) {
            for (const key in or.rawValues) {
                if (Object.prototype.hasOwnProperty.call(or.rawValues, key)) {
                    const element = or.rawValues[key];
                    if (element) {
                        if (element.bad)
                            this.notOk(element.field);
                        else {
                            this.ok(element.field, ...element.values);
                        }
                    }
                }
            }
        }
        for (const key in this.rawValues) {
            if (Object.prototype.hasOwnProperty.call(this.rawValues, key)) {
                for (const r of result) {
                    const element = r.rawValues[key];
                    if (!element)
                        this.notOk(this.rawValues[key].field);
                }
            }
        }
    }
    isEqualTo(col, val) {
        this.ok(col, val);
    }
    isDifferentFrom(col, val) {
        this.notOk(col);
    }
    isNull(col) {
        this.ok(col, null);
    }
    isNotNull(col) {
        this.notOk(col);
    }
    isGreaterOrEqualTo(col, val) {
        this.notOk(col);
    }
    isGreaterThan(col, val) {
        this.notOk(col);
    }
    isLessOrEqualTo(col, val) {
        this.notOk(col);
    }
    isLessThan(col, val) {
        this.notOk(col);
    }
    containsCaseInsensitive(col, val) {
        this.notOk(col);
    }
    notContainsCaseInsensitive(col, val) {
        this.notOk(col);
    }
    startsWithCaseInsensitive(col, val) {
        this.notOk(col);
    }
    endsWithCaseInsensitive(col, val) {
        this.notOk(col);
    }
    isIn(col, val) {
        this.ok(col, ...val);
    }
    custom(key, customItem) { }
    databaseCustom(databaseCustom) { }
}

const remultStaticKey = Symbol.for('remult-static1');
let x = {
    defaultRemultFactory: undefined,
    remultFactory: undefined,
    defaultRemult: undefined,
    asyncContext: undefined,
    columnsOfType: new Map(),
    allEntities: [],
    classHelpers: new Map(),
    actionInfo: {
        allActions: [],
        runningOnServer: false,
        runActionWithoutBlockingUI: (what) => {
            return what();
        },
        startBusyWithProgress: () => ({
            progress: (percent) => { },
            close: () => { },
        }),
    },
    fieldOptionsEnricher: undefined,
    labelTransformer: undefined,
    defaultIdFactory: undefined,
    defaultDataProvider: () => undefined,
};
if ((typeof process !== 'undefined' &&
    process.env['IGNORE_GLOBAL_REMULT_IN_TESTS']) ||
    typeof globalThis[remultStaticKey] === 'undefined') {
    globalThis[remultStaticKey] = x;
    x.remultFactory = () => defaultFactory();
}
else {
    x = globalThis[remultStaticKey];
}
const remultStatic = x;
function defaultFactory() {
    if (!remultStatic.defaultRemult) {
        remultStatic.defaultRemult = remultStatic.defaultRemultFactory();
    }
    return remultStatic.defaultRemult;
}
function resetFactory() {
    remultStatic.remultFactory = () => defaultFactory();
}

function getRepositoryInternals(repo) {
    const x = repo;
    if (typeof x[getInternalKey] === 'function')
        return x[getInternalKey]();
    throw Error('Error getting repository internal from ' + repo);
}
const getInternalKey = Symbol.for('getInternal');

/*@internal*/
class RemultProxy {
    /* @internal*/
    iAmRemultProxy = true;
    /* @internal*/
    get liveQuerySubscriber() {
        return remultStatic.remultFactory().liveQuerySubscriber;
    }
    /* @internal*/
    set liveQuerySubscriber(val) {
        remultStatic.remultFactory().liveQuerySubscriber = val;
    }
    /* @internal*/
    get liveQueryStorage() {
        return remultStatic.remultFactory().liveQueryStorage;
    }
    /* @internal*/
    set liveQueryStorage(val) {
        remultStatic.remultFactory().liveQueryStorage = val;
    }
    /* @internal*/
    get liveQueryPublisher() {
        return remultStatic.remultFactory().liveQueryPublisher;
    }
    /* @internal*/
    set liveQueryPublisher(val) {
        remultStatic.remultFactory().liveQueryPublisher = val;
    }
    subscribeAuth(listener) {
        return remultStatic.remultFactory().subscribeAuth(listener);
    }
    initUser() {
        return remultStatic.remultFactory().initUser();
    }
    call(backendMethod, self, ...args) {
        return remultStatic.remultFactory().call(backendMethod, self, ...args);
    }
    get context() {
        return remultStatic.remultFactory().context;
    }
    get dataProvider() {
        return remultStatic.remultFactory().dataProvider;
    }
    set dataProvider(provider) {
        remultStatic.remultFactory().dataProvider = provider;
    }
    /*@internal*/
    get repCache() {
        return remultStatic.remultFactory().repCache;
    }
    authenticated() {
        return remultStatic.remultFactory().authenticated();
    }
    isAllowed(roles) {
        return remultStatic.remultFactory().isAllowed(roles);
    }
    isAllowedForInstance(instance, allowed) {
        return remultStatic.remultFactory().isAllowedForInstance(instance, allowed);
    }
    clearAllCache() {
        return remultStatic.remultFactory().clearAllCache();
    }
    useFetch(args) {
        return remultStatic.remultFactory().useFetch(args);
    }
    repoCache = new Map();
    //@ts-ignore
    repo = (...args) => {
        let self = remultStatic;
        let entityCache = this.repoCache.get(args[0]);
        if (!entityCache) {
            this.repoCache.set(args[0], (entityCache = new Map()));
        }
        let result = entityCache.get(args[1]);
        if (result)
            return result;
        result = {
            get fields() {
                return remultStatic.remultFactory().repo(...args).metadata.fields;
            },
            //@ts-ignore
            [getInternalKey]() {
                return self.remultFactory().repo(...args)[getInternalKey]();
            },
            relations: (args2) => self
                .remultFactory()
                .repo(...args)
                .relations(args2),
            validate: (a, ...b) => self
                .remultFactory()
                .repo(...args)
                //@ts-ignore
                .validate(a, ...b),
            addEventListener: (...args2) => self
                .remultFactory()
                .repo(...args)
                .addEventListener(...args2),
            count: (...args2) => self
                .remultFactory()
                .repo(...args)
                .count(...args2),
            create: (...args2) => self
                .remultFactory()
                .repo(...args)
                .create(...args2),
            delete: (args2) => self
                .remultFactory()
                .repo(...args)
                .delete(args2),
            deleteMany: (args2) => self
                .remultFactory()
                .repo(...args)
                .deleteMany(args2),
            updateMany: (...args2) => self
                .remultFactory()
                .repo(...args)
                .updateMany(...args2),
            find: (...args2) => self
                .remultFactory()
                .repo(...args)
                .find(...args2),
            groupBy: (...args2) => self
                .remultFactory()
                .repo(...args)
                //@ts-ignore
                .groupBy(...args2),
            aggregate: (...args2) => self
                .remultFactory()
                .repo(...args)
                //@ts-ignore
                .aggregate(...args2),
            findFirst: (...args2) => self
                .remultFactory()
                .repo(...args)
                .findFirst(...args2),
            findOne: (...args2) => self
                .remultFactory()
                .repo(...args)
                .findOne(...args2),
            findId: (a, b) => self
                .remultFactory()
                .repo(...args)
                .findId(a, b),
            //@ts-ignore
            toJson: (json) => self
                .remultFactory()
                .repo(...args)
                .toJson(json),
            fromJson: (item, isNew) => self
                .remultFactory()
                .repo(...args)
                .fromJson(item, isNew),
            getEntityRef: (...args2) => self
                .remultFactory()
                .repo(...args)
                .getEntityRef(...args2),
            insert: (args2, args3) => self
                .remultFactory()
                .repo(...args)
                .insert(args2, args3),
            liveQuery: (...args2) => self
                .remultFactory()
                .repo(...args)
                .liveQuery(...args2),
            get metadata() {
                return remultStatic.remultFactory().repo(...args).metadata;
            },
            query: (options) => self
                .remultFactory()
                .repo(...args)
                .query(options),
            save: (args2) => self
                .remultFactory()
                .repo(...args)
                .save(args2),
            upsert: (args2) => self
                .remultFactory()
                .repo(...args)
                .upsert(args2),
            update: (a, b, c) => self
                .remultFactory()
                .repo(...args)
                .update(a, b, c),
        };
        entityCache.set(args[1], result);
        return result;
    };
    get user() {
        return remultStatic.remultFactory().user;
    }
    set user(info) {
        remultStatic.remultFactory().user = info;
    }
    get apiClient() {
        return remultStatic.remultFactory().apiClient;
    }
    set apiClient(client) {
        remultStatic.remultFactory().apiClient = client;
    }
    get subscriptionServer() {
        return remultStatic.remultFactory().subscriptionServer;
    }
    set subscriptionServer(value) {
        remultStatic.remultFactory().subscriptionServer = value;
    }
}
const remult = new RemultProxy();

const GroupByCountMember = '$count';
const GroupByForApiKey = Symbol.for('GroupByForApiKey');
const GroupByOperators = [
    'sum',
    'avg',
    'min',
    'max',
    'distinctCount',
];
const flags = {
    error500RetryCount: 4,
};
/*p1 - issues in https://stackblitz.com/edit/demo-allow-delete-based-on-other-entity:
  - don't like the ensure schema
  - seems like this didn't work well in their version of sqlite:
    ```
    @Entity<TaskUser>('TaskUsers', {
      id: ['taskId', 'userId'],
    })
    ```
  - This could be better
    ```
    sqlExpression: async () => {
        if (!remult.authenticated()) return 'false';
        return (
          '1=' +
          (await sqlRelations(Task).taskUsers.$count({
            userId: [remult.user?.id],
            canDelete: true,
          }))
        );
      },
    ```
  
  -
*/
/*p1 - https://github.com/remult/remult/discussions/438
  - should we use the arg for update and insert? for the returning query?
  - Does dbNamesOf still makes sense? I think that abstraction, regarding sql expression has lost it's merit
  - remember caching of sql expression  calculations that took a recursive amount of time for JYC
  - maybe introduce a ready dbNamesOf of argument that will be aware of prefixes
  - I've changed the order by to support order by 1

*/
//p1 - deleteAll({title:undefined}) should throw an error - not return 0 (with direct call to db)
//p1 - remult-create, move db question ahead of auth - everyone needs a database, not everyone need auth
//p1 - allow experimental route registration on remult server, with at least get route, and support redirect, read header and set header - (and the existing get html etc...)
//p2 - add parameter all to deleteMany, and updateMany
//p2  filter.apply ApiPreFilter
//p2 - signIn: (arg) =>withRemult(async () => { - consider if there's a generic way of doing signIn:withRemult(arg=>{})
/*p2 - add id and use uuid by default, but allow changes with Fields.id.defaultIdProvider NO but defaultProvider yes???
  //p2 - replace uuid with crypto.randomUUID and allow custom fallback NO
  //p2 - Add example for luid
  //p2 - add example for nanoid
  //p2 - explain the benefits of changing the default provider for testing in docs.
*/
//p2 - add some kind of options handler that will help with translation etc... like in hagai - something that runs at the stage where options are being built
//p2 - enforce api rules in some backend scenarios - https://discord.com/channels/975754286384418847/1292424895338119239
/*y1 - https://github.com/remult/remult/discussions/438
     - https://github.com/remult/remult/blob/query-argumets/projects/tests/dbs/test-sql-database.spec.ts#L100-L128
     //y1 - consider sql expression gets a dbnames of it's own (that already has the "tableName" defined correctly) maybe also the filter translator
     //p2 - allow preprocess to replace filter values - for example replace $contains on a specific field, with specific other sql - useful for full text search and other scenarios
     //y2 - soft-delete-discussion https://discord.com/channels/975754286384418847/1230386433093533698/1230386433093533698
*/
//p2 - fix query docs to also explain how it can be used for infinite scroll and pagination.
//p2 - when like doesn't have a string - don't send it to the db
//p2 - vite 5.3 supports ts5 decorators - check and adapt.
//p2 - tutorial about controller - and mutable controller
//p2 - docs abount subscription channel
//p2 - add LifecycleEvent to documentation
//p2 - fix chaining of saving and saved in multiple entity options args
//y1 - live query with count #436
//y1 TODO - In the esm version of our tutorial - the imports are automatically .ts and not .js in react and not in vue
//y1 TODO - fix remult admin not to load the html into memory until used
//y2 - talk about insert / update / delete with relations
/*
repo(Order).insert({},{
  relations:{
    orderItems:[{},{},{}]
  }
})
*/
//y2 - repo batch - for multiple operations:
//y2 - request by jy find and count / aggregate with a single call
/*
const result = await repo.batch(x=>({
  data:x.find(),
  count:x.count()
}))
*/
//y1 - wait a second to close stream -see pr
//p1 - prepare the createEntity discussion
//p2 - article on displayValue including it's definition for entities that is used in relations
//p2 - create foreign key constraints in user code - https://codesandbox.io/p/devbox/fk-validator-tdshcs, https://gist.github.com/jycouet/8b264e18c4d8605736f4353062a7d81e
//y2 - should we validate relations
//y1 - dependency of live query tables  live query refresh of view on table update
//y2 - consider replacing all errors with error classes that extend the base Error class
//y2 - should enforce integer - currently we probably round / truncate it
//y1 - talk about filter on objects that are not loaded -  {
//category: repo(CompoundId).create({ company: 7, index: 3, name: '' }),
//    }
/*y1 - talk about modules in init express with entities/controllers,initRequest,initApi
 - support get with backend method, with url search params as the first parameter, & url as second parameter
   - support returning redirect, and plain html (For sign in scenarios)

 */
//p1 - in this video I'll use remult to turn a frontend app to a fullstack app
/*y2 - Talk JYC - JYC - add some integrity checks on delete
  - soft delete
  - delete restrict (implicit, or user selected - and if so, how) (delete & update of id)

*/
//y1 - talk about the parameter issue with backend methods
//y2 - livequery for findfirst (@JY)
/*y2 -
//y2 - allow api update only for new rows
  @Fields.string<Category>({
    allowApiUpdate: (c) => getEntityRef(c).isNew(),
  })
  Description = ""*/
//p1 - get backend methods to work when specifying types for date, and entities as poco's - https://discord.com/channels/975754286384418847/976006081748807690/1289806378864476271
//y2 - constraints (@JY)
//p1 - when a tasks table exists in a different schema - we get many errors
//p1 - live query with include
//y2 - Fix problem with promise all in sql expression recurssion - when using PromiseAll in row relation loading, some sql expressions appear is recursion call even if they are not
//p2 - when subscribe is forbidden - the query still runs after the renew process
//p2 - 'update tasks set  where id = $1
//p2 - when value changes for field with error, clear error - so the user will feel comfortable
//p2 - allowApiUpdate should be false for include in api false
//docs
//------
//y2 - wrap identifier for custom filter & sql expression
//y2 - Should we create a separate implementation of command - one that the user uses, and another that the database implements (with only the bear necesities) - for example, to provide a second paramter called field for toDb conversions
//y2 - should we simply inherit from SqlDataProvider - and send the required parameter in the call to the base class - I think that new SqlDatabase(new PostgresDataProvider()) is a bilt combersome
//y2 - from the crm-demo(https://crm-demo.up.railway.app/deals), after editing a deal: - _updateEntityBasedOnApi
//y1 - how to run a transaction as a user
//y2 - message for relation that is missing
//y2 - consider multi tenancies
//p2 - and validators to reference
//y2 - discuss a default date formatter
//y2 - add some api testing framework for user unit tests (will help with codesandbox based discussions)
//[ ] V2 - what to do about for relations count?
//[ ] V2 - condition? not to fetch if null etc....

function makeTitle(name) {
    // insert a space before all caps
    return (name
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // Uppercase the first character
        .replace(/^./, (str) => str.toUpperCase())
        .replace('Email', 'eMail'));
}
class LookupColumn {
    repository;
    isReferenceRelation;
    allowNull;
    toJson() {
        if (!this.storedItem)
            return undefined;
        if (this.item === null)
            return null;
        return this.repository.toJson(this.item);
    }
    setId(val) {
        if (this.repository.metadata.idMetadata.field.valueType == Number)
            val = +val;
        this.id = val;
    }
    waitLoadOf(id) {
        if (id === undefined || id === null)
            return null;
        return getRepositoryInternals(this.repository)._getCachedByIdAsync(id, false);
    }
    get(id) {
        if (id === undefined || id === null)
            return null;
        const result = getRepositoryInternals(this.repository)._getCachedById(id, this.isReferenceRelation);
        if (this.isReferenceRelation && !this.storedItem) {
            if (!this.allowNull && (this.id === 0 || this.id === ''))
                return null;
            return undefined;
        }
        return result;
    }
    storedItem;
    set(item) {
        if (item === null &&
            !this.allowNull &&
            this.isReferenceRelation &&
            (this.id == 0 || this.id == '')) {
            this.storedItem = { item: null };
            return;
        }
        this.storedItem = undefined;
        if (item) {
            if (typeof item === 'string' || typeof item === 'number')
                this.id = item;
            else {
                let eo = getEntityRef(item, false);
                if (eo && !this.isReferenceRelation) {
                    getRepositoryInternals(this.repository)._addToCache(item);
                    this.id = eo.getId();
                }
                else {
                    this.storedItem = { item };
                    this.id = item[this.repository.metadata.idMetadata.field.key];
                }
            }
        }
        else if (item === null) {
            this.id = null;
        }
        else {
            this.id = undefined;
        }
    }
    id;
    constructor(repository, isReferenceRelation, allowNull) {
        this.repository = repository;
        this.isReferenceRelation = isReferenceRelation;
        this.allowNull = allowNull;
    }
    get item() {
        if (this.storedItem)
            return this.storedItem.item;
        return this.get(this.id);
    }
    async waitLoad() {
        return this.waitLoadOf(this.id);
    }
}

/**
 * The `Sort` class is used to describe sorting criteria for queries. It is mainly used internally,
 * but it provides a few useful functions for working with sorting.
 */
class Sort {
    /**
     * Translates the current `Sort` instance into an `EntityOrderBy` object.
     *
     * @returns {EntityOrderBy<any>} An `EntityOrderBy` object representing the sort criteria.
     */
    toEntityOrderBy() {
        let result = {};
        for (const seg of this.Segments) {
            if (seg.isDescending) {
                result[seg.field.key] = 'desc';
            }
            else
                result[seg.field.key] = 'asc';
        }
        return result;
    }
    /**
     * Constructs a `Sort` instance with the provided sort segments.
     *
     * @param {...SortSegment[]} segments The sort segments to be included in the sort criteria.
     */
    constructor(...segments) {
        this.Segments = segments;
    }
    /**
     * The segments of the sort criteria.
     *
     * @type {SortSegment[]}
     */
    Segments;
    /**
     * Reverses the sort order of the current sort criteria.
     *
     * @returns {Sort} A new `Sort` instance with the reversed sort order.
     */
    reverse() {
        let r = new Sort();
        for (const s of this.Segments) {
            r.Segments.push({ field: s.field, isDescending: !s.isDescending });
        }
        return r;
    }
    /**
     * Compares two objects based on the current sort criteria.
     *
     * @param {any} a The first object to compare.
     * @param {any} b The second object to compare.
     * @param {function(FieldMetadata): string} [getFieldKey] An optional function to get the field key for comparison.
     * @returns {number} A negative value if `a` should come before `b`, a positive value if `a` should come after `b`, or zero if they are equal.
     */
    compare(a, b, getFieldKey) {
        if (!getFieldKey)
            getFieldKey = (x) => x.key;
        for (let i = 0; i < this.Segments.length; i++) {
            let seg = this.Segments[i];
            let left = a[getFieldKey(seg.field)];
            let right = b[getFieldKey(seg.field)];
            let descending = seg.isDescending;
            let r = compareForSort(left, right, descending);
            if (r != 0) {
                return r;
            }
        }
        return 0;
    }
    /**
     * Translates an `EntityOrderBy` to a `Sort` instance.
     *
     * @template T The entity type for the order by.
     * @param {EntityMetadata<T>} entityDefs The metadata of the entity associated with the order by.
     * @param {EntityOrderBy<T>} [orderBy] The `EntityOrderBy` to be translated.
     * @returns {Sort} A `Sort` instance representing the translated order by.
     */
    static translateOrderByToSort(entityDefs, orderBy) {
        let sort = new Sort();
        if (orderBy)
            for (const key in orderBy) {
                if (Object.prototype.hasOwnProperty.call(orderBy, key)) {
                    const element = orderBy[key];
                    let field = entityDefs.fields.find(key);
                    const addSegment = (field) => {
                        switch (element) {
                            case 'desc':
                                sort.Segments.push({ field, isDescending: true });
                                break;
                            case 'asc':
                                sort.Segments.push({ field });
                        }
                    };
                    if (field) {
                        const rel = getRelationFieldInfo(field);
                        if (rel?.type === 'toOne') {
                            const op = rel.options;
                            if (typeof op.field === 'string') {
                                addSegment(entityDefs.fields.find(op.field));
                            }
                            else {
                                if (op.fields) {
                                    for (const key in op.fields) {
                                        if (Object.prototype.hasOwnProperty.call(op.fields, key)) {
                                            const keyInMyEntity = op.fields[key];
                                            addSegment(entityDefs.fields.find(keyInMyEntity.toString()));
                                        }
                                    }
                                }
                            }
                        }
                        else
                            addSegment(field);
                    }
                }
            }
        return sort;
    }
    /**
     * Creates a unique `Sort` instance based on the provided `Sort` and the entity metadata.
     * This ensures that the sort criteria result in a unique ordering of entities.
     *
     * @template T The entity type for the sort.
     * @param {EntityMetadata<T>} entityMetadata The metadata of the entity associated with the sort.
     * @param {Sort} [orderBy] The `Sort` instance to be made unique.
     * @returns {Sort} A `Sort` instance representing the unique sort criteria.
     */
    static createUniqueSort(entityMetadata, orderBy) {
        if ((!orderBy || Object.keys(orderBy).length === 0) &&
            entityMetadata.options.defaultOrderBy)
            orderBy = Sort.translateOrderByToSort(entityMetadata, entityMetadata.options.defaultOrderBy);
        if (!orderBy)
            orderBy = new Sort();
        for (const field of entityMetadata.idMetadata.fields) {
            if (!orderBy.Segments.find((x) => x.field == field)) {
                orderBy.Segments.push({ field: field });
            }
        }
        return orderBy;
    }
    /**
     * Creates a unique `EntityOrderBy` based on the provided `EntityOrderBy` and the entity metadata.
     * This ensures that the order by criteria result in a unique ordering of entities.
     *
     * @template T The entity type for the order by.
     * @param {EntityMetadata<T>} entityMetadata The metadata of the entity associated with the order by.
     * @param {EntityOrderBy<T>} [orderBy] The `EntityOrderBy` to be made unique.
     * @returns {EntityOrderBy<T>} An `EntityOrderBy` representing the unique order by criteria.
     */
    static createUniqueEntityOrderBy(entityMetadata, orderBy) {
        if (!orderBy || Object.keys(orderBy).length === 0)
            orderBy = entityMetadata.options.defaultOrderBy;
        if (!orderBy)
            orderBy = {};
        else
            orderBy = { ...orderBy };
        for (const field of entityMetadata.idMetadata.fields) {
            if (!orderBy[field.key]) {
                orderBy[field.key] = 'asc';
            }
        }
        return orderBy;
    }
}
function compareForSort(left, right, descending) {
    left = fixValueForSort(left);
    right = fixValueForSort(right);
    let r = 0;
    if (left > right)
        r = 1;
    else if (left < right)
        r = -1;
    if (descending)
        r *= -1;
    return r;
}
function fixValueForSort(a) {
    if (a == undefined || a == null)
        return a;
    if (a.id !== undefined)
        return a.id;
    return a;
}

class EntityError extends Error {
    constructor(errorInfo) {
        super(errorInfo.message);
        Object.assign(this, errorInfo);
    }
    modelState;
    stack;
    exception;
    httpStatusCode;
}
class DataProviderPromiseWrapper {
    dataProvider;
    constructor(dataProvider) {
        this.dataProvider = dataProvider;
    }
    getEntityDataProvider(entity) {
        return new EntityDataProviderPromiseWrapper(this.dataProvider.then((dp) => dp.getEntityDataProvider(entity)));
    }
    transaction(action) {
        return this.dataProvider.then((dp) => dp.transaction(action));
    }
    ensureSchema(entities) {
        return this.dataProvider.then((dp) => dp.ensureSchema?.(entities));
    }
    isProxy;
}
class EntityDataProviderPromiseWrapper {
    dataProvider;
    constructor(dataProvider) {
        this.dataProvider = dataProvider;
    }
    delete(id) {
        return this.dataProvider.then((dp) => dp.delete(id));
    }
    insert(data) {
        return this.dataProvider.then((dp) => dp.insert(data));
    }
    count(where) {
        return this.dataProvider.then((dp) => dp.count(where));
    }
    find(options) {
        return this.dataProvider.then((dp) => dp.find(options));
    }
    groupBy(options) {
        return this.dataProvider.then((dp) => dp.groupBy(options));
    }
    update(id, data) {
        return this.dataProvider.then((dp) => dp.update(id, data));
    }
}

class UrlBuilder {
    url;
    constructor(url) {
        this.url = url;
    }
    add(key, value) {
        if (this.url.indexOf('?') >= 0)
            this.url += '&';
        else
            this.url += '?';
        this.url += encodeURIComponent(key) + '=' + encodeURIComponent(value);
    }
    addObject(object, suffix = '') {
        if (object != undefined)
            for (var key in object) {
                let val = object[key];
                this.add(key + suffix, val);
            }
    }
}

async function retry(what) {
    let i = 0;
    while (true) {
        try {
            return await what();
        }
        catch (err) {
            if ((err.message?.startsWith('Error occurred while trying to proxy') ||
                err.message?.startsWith('Error occured while trying to proxy') ||
                err.message?.includes('http proxy error') ||
                err.message?.startsWith('Gateway Timeout') ||
                err.status == 500) &&
                i++ < flags.error500RetryCount) {
                await new Promise((res, req) => {
                    setTimeout(() => {
                        res({});
                    }, 500);
                });
                continue;
            }
            throw err;
        }
    }
}

class RestDataProviderHttpProviderUsingFetch {
    fetch;
    constructor(fetch) {
        this.fetch = fetch;
    }
    async get(url) {
        return await retry(async () => this.myFetch(url).then((r) => {
            return r;
        }));
    }
    put(url, data) {
        return this.myFetch(url, {
            method: 'put',
            body: JSON.stringify(data),
        });
    }
    delete(url) {
        return this.myFetch(url, { method: 'delete' });
    }
    async post(url, data) {
        return await retry(() => this.myFetch(url, {
            method: 'post',
            body: JSON.stringify(data),
        }));
    }
    myFetch(url, options) {
        const headers = {};
        if (options?.body)
            headers['Content-type'] = 'application/json';
        if (typeof window !== 'undefined' &&
            typeof window.document !== 'undefined' &&
            typeof (window.document.cookie !== 'undefined'))
            for (const cookie of window.document.cookie.split(';')) {
                if (cookie.trim().startsWith('XSRF-TOKEN=')) {
                    headers['X-XSRF-TOKEN'] = cookie.split('=')[1];
                }
            }
        return (this.fetch || fetch)(url, {
            credentials: 'include',
            method: options?.method,
            body: options?.body,
            headers,
        })
            .then((response) => {
            return onSuccess(response);
        })
            .catch(async (error) => {
            let r = await error;
            throw r;
        });
    }
}
function onSuccess(response) {
    if (response.status == 204)
        return;
    if (response.status >= 200 && response.status < 300)
        return response.json();
    else {
        throw response
            .json()
            .then((x) => {
            return {
                ...x,
                message: x.message || response.statusText,
                url: response.url,
                status: response.status,
            };
        })
            .catch(() => {
            throw {
                message: response.statusText,
                url: response.url,
                status: response.status,
            };
        });
    }
}

function buildRestDataProvider(provider) {
    if (!provider)
        return new RestDataProviderHttpProviderUsingFetch();
    let httpDataProvider;
    if (!httpDataProvider) {
        if (isExternalHttpProvider(provider)) {
            httpDataProvider = new HttpProviderBridgeToRestDataProviderHttpProvider(provider);
        }
    }
    if (!httpDataProvider) {
        if (typeof provider === 'function') {
            httpDataProvider = new RestDataProviderHttpProviderUsingFetch(provider);
        }
    }
    return httpDataProvider;
}
function isExternalHttpProvider(item) {
    let http = item;
    if (http && http.get && http.put && http.post && http.delete)
        return true;
    return false;
}
class HttpProviderBridgeToRestDataProviderHttpProvider {
    http;
    constructor(http) {
        this.http = http;
    }
    async post(url, data) {
        return await retry(() => toPromise(this.http.post(url, data)));
    }
    delete(url) {
        return toPromise(this.http.delete(url));
    }
    put(url, data) {
        return toPromise(this.http.put(url, data));
    }
    async get(url) {
        return await retry(() => toPromise(this.http.get(url)));
    }
}
function toPromise(p) {
    let r;
    if (p['toPromise'] !== undefined) {
        r = p['toPromise']();
    }
    //@ts-ignore
    else
        r = p;
    return r
        .then((x) => {
        if (x &&
            (x.status == 200 || x.status == 201) &&
            x.headers &&
            x.request &&
            x.data !== undefined)
            //for axios
            return x.data;
        return x;
    })
        .catch(async (ex) => {
        throw await processHttpException(ex);
    });
}
async function processHttpException(ex) {
    let z = await ex;
    var error;
    if (z.error)
        error = z.error;
    else if (z.isAxiosError) {
        if (typeof z.response?.data === 'string')
            error = z.response.data;
        else
            error = z?.response?.data;
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
    let httpStatusCode = z.status;
    if (httpStatusCode === undefined)
        httpStatusCode = z.response?.status;
    if (httpStatusCode !== undefined && httpStatusCode !== null) {
        error.httpStatusCode = httpStatusCode;
    }
    var result = Object.assign(error ?? {}, {
    //     exception: ex disabled for now because JSON.stringify crashed with this
    });
    return result;
}

class RestDataProvider {
    apiProvider;
    entityRequested;
    constructor(apiProvider, entityRequested) {
        this.apiProvider = apiProvider;
        this.entityRequested = entityRequested;
    }
    getEntityDataProvider(entity) {
        this.entityRequested?.(entity);
        return new RestEntityDataProvider(() => {
            return buildFullUrl(this.apiProvider()?.url, entity.key);
        }, () => {
            return buildRestDataProvider(this.apiProvider().httpClient);
        }, entity);
    }
    async transaction(action) {
        throw new Error('Method not implemented.');
    }
    isProxy = true;
}
function buildFullUrl(httpClientUrl, entityKey) {
    if (httpClientUrl === undefined || httpClientUrl === null)
        httpClientUrl = '/api';
    return httpClientUrl + '/' + entityKey;
}
//@internal
function findOptionsToJson(options, meta) {
    if (options.include) {
        let newInclude = {};
        for (const key in options.include) {
            if (Object.prototype.hasOwnProperty.call(options.include, key)) {
                let element = options.include[key];
                if (typeof element === 'object') {
                    const rel = getRelationFieldInfo(meta.fields.find(key));
                    if (rel) {
                        element = findOptionsToJson(element, rel.toRepo.metadata);
                    }
                }
                newInclude[key] = element;
            }
        }
        options = { ...options, include: newInclude };
    }
    if (options.where)
        options = {
            ...options,
            where: Filter.entityFilterToJson(meta, options.where),
        };
    if (options.load)
        options = {
            ...options,
            load: options.load(meta.fields).map((y) => y.key),
        };
    if (options.select) {
        options = { ...options, select: Object.keys(options.select) };
    }
    return options;
}
//@internal
function findOptionsFromJson(json, meta) {
    let r = {};
    for (const key of [
        'limit',
        'page',
        'where',
        'orderBy',
        'include',
        'select',
        'args',
    ]) {
        if (json[key] !== undefined) {
            if (key === 'where') {
                r[key] = Filter.entityFilterFromJson(meta, json.where);
            }
            else if (key === 'include') {
                let newInclude = { ...json[key] };
                for (const key in newInclude) {
                    if (Object.prototype.hasOwnProperty.call(newInclude, key)) {
                        let element = newInclude[key];
                        if (typeof element === 'object') {
                            const rel = getRelationFieldInfo(meta.fields.find(key));
                            if (rel) {
                                element = findOptionsFromJson(element, rel.toRepo.metadata);
                            }
                        }
                        newInclude[key] = element;
                    }
                }
                r[key] = newInclude;
            }
            else if (key === 'select') {
                r[key] = json.select.reduce((acc, key) => {
                    acc[key] = true;
                    return acc;
                }, {});
            }
            else
                r[key] = json[key];
        }
    }
    if (json.load) {
        r.load = (z) => json.load.map((y) => z.find(y));
    }
    return r;
}
class RestEntityDataProvider {
    url;
    http;
    entity;
    constructor(url, http, entity) {
        this.url = url;
        this.http = http;
        this.entity = entity;
    }
    query(options, aggregateOptions) {
        const r = this.buildFindRequest(options);
        return r
            .run('query', {
            aggregate: this.buildAggregateOptions(aggregateOptions),
        })
            .then(({ items, aggregates }) => ({
            items: items.map((x) => this.translateFromJson(x)),
            aggregates,
        }));
    }
    async groupBy(options) {
        const { run } = this.buildFindRequest({
            where: options?.where,
            limit: options?.limit,
            page: options?.page,
        });
        const body = this.buildAggregateOptions(options);
        const result = await run('groupBy', Object.keys(body).length > 0 ? body : undefined);
        if (options?.group)
            result.forEach((row) => {
                for (const g of options.group) {
                    row[g.key] = g.valueConverter.fromJson(row[g.key]);
                }
            });
        for (const element of ['min', 'max']) {
            if (options?.[element])
                result.forEach((row) => {
                    for (const f of options[element]) {
                        row[f.key][element] = f.valueConverter.fromJson(row[f.key][element]);
                    }
                });
        }
        return result;
    }
    buildAggregateOptions(options) {
        return {
            groupBy: options?.group?.map((x) => x.key),
            sum: options?.sum?.map((x) => x.key),
            avg: options?.avg?.map((x) => x.key),
            min: options?.min?.map((x) => x.key),
            max: options?.max?.map((x) => x.key),
            distinctCount: options?.distinctCount?.map((x) => x.key),
            orderBy: options?.orderBy?.map((x) => ({ ...x, field: x.field?.key })),
        };
    }
    translateFromJson(row) {
        let result = {};
        for (const col of this.entity.fields) {
            result[col.key] = col.valueConverter.fromJson(row[col.key]);
        }
        return result;
    }
    translateToJson(row) {
        let result = {};
        for (const col of this.entity.fields) {
            result[col.key] = col.valueConverter.toJson(row[col.key]);
        }
        return result;
    }
    async count(where) {
        const { run } = this.buildFindRequest({ where });
        return run('count').then((r) => +r.count);
    }
    async deleteMany(where) {
        const { run } = this.buildFindRequest({ where }, 'delete');
        return run('deleteMany').then((r) => +r.deleted);
    }
    async updateMany(where, data) {
        const { run } = this.buildFindRequest({ where }, 'put');
        return run('updateMany', this.toJsonOfIncludedKeys(data)).then((r) => +r.updated);
    }
    async upsertMany(options) {
        const { run } = this.buildFindRequest(undefined);
        return run('upsertMany', options.map((x) => ({
            where: this.toJsonOfIncludedKeys(x.where),
            set: x.set !== undefined ? this.toJsonOfIncludedKeys(x.set) : undefined,
        }))).then((r) => r.map((x) => this.translateFromJson(x)));
    }
    find(options) {
        let { run } = this.buildFindRequest(options);
        return run().then((x) => x.map((y) => this.translateFromJson(y)));
    }
    //@internal
    buildFindRequest(options, method) {
        if (!method)
            method = 'get';
        let url = new UrlBuilder(this.url());
        let filterObject;
        if (options) {
            if (options.where === 'all') {
                filterObject = 'all';
            }
            else {
                if (options.where) {
                    filterObject = options.where.toJson();
                    if (options.args === undefined)
                        if (addFilterToUrlAndReturnTrueIfSuccessful(filterObject, url))
                            filterObject = undefined;
                }
                if (options.orderBy && options.orderBy.Segments) {
                    let sort = '';
                    let order = '';
                    let hasDescending = false;
                    options.orderBy.Segments.forEach((c) => {
                        if (sort.length > 0) {
                            sort += ',';
                            order += ',';
                        }
                        sort += c.field.key;
                        order += c.isDescending ? 'desc' : 'asc';
                        if (c.isDescending)
                            hasDescending = true;
                    });
                    if (sort)
                        url.add('_sort', sort);
                    if (hasDescending)
                        url.add('_order', order);
                }
                if (options.limit)
                    url.add('_limit', options.limit);
                if (options.page)
                    url.add('_page', options.page);
                if (options.select) {
                    url.add('_select', options.select.join(','));
                }
            }
        }
        const run = (action, body) => {
            let u = new UrlBuilder(url.url);
            if (!action && filterObject) {
                action = 'get';
            }
            if (action)
                u.add('__action', action);
            if (filterObject) {
                if (method === 'put') {
                    return this.http().post(u.url, { set: body, where: filterObject });
                }
                else
                    body = { ...body, where: filterObject };
            }
            if (options && 'args' in options)
                body.args = options.args;
            if (body && method != 'put')
                return this.http().post(u.url, body);
            else
                return this.http()[method](u.url, body);
        };
        return {
            createKey: () => JSON.stringify({ url, filterObject }),
            run,
            subscribe: async (queryId) => {
                const result = await run(liveQueryAction + queryId);
                return {
                    result,
                    unsubscribe: async () => {
                        return remultStatic.actionInfo.runActionWithoutBlockingUI(() => this.http().post(this.url() + '?__action=endLiveQuery', {
                            id: queryId,
                        }));
                    },
                };
            },
        };
    }
    update(id, data, options) {
        const urlArgs = [];
        if (id == '')
            urlArgs.push('__action=emptyId');
        if (options?.select === 'none')
            urlArgs.push('_select=$none');
        return this.http()
            .put(this.url() +
            (id != '' ? '/' + encodeURIComponent(id) : '') +
            (urlArgs.length > 0 ? '?' + urlArgs.join('&') : ''), this.toJsonOfIncludedKeys(data))
            .then((y) => this.translateFromJson(y));
    }
    toJsonOfIncludedKeys(data) {
        let result = {};
        let keys = Object.keys(data);
        for (const col of this.entity.fields) {
            if (keys.includes(col.key))
                result[col.key] = col.valueConverter.toJson(data[col.key]);
        }
        return result;
    }
    async delete(id) {
        if (id == '')
            await this.deleteMany(Filter.fromEntityFilter(this.entity, this.entity.idMetadata.getIdFilter(id)));
        else
            return this.http().delete(this.url() + '/' + encodeURIComponent(id));
    }
    insert(data, options) {
        return this.http()
            .post(this.url() + (options?.select === 'none' ? '?_select=$none' : ''), this.translateToJson(data))
            .then((y) => this.translateFromJson(y));
    }
    insertMany(data, options) {
        return this.http()
            .post(this.url() + (options?.select === 'none' ? '?_select=$none' : ''), data.map((data) => this.translateToJson(data)))
            .then((y) => y.map((y) => this.translateFromJson(y)));
    }
}
function addFilterToUrlAndReturnTrueIfSuccessful(filter, url) {
    for (const key in filter) {
        if (Object.prototype.hasOwnProperty.call(filter, key)) {
            const element = filter[key];
            if (Array.isArray(element)) {
                if (element.length > 0 && typeof element[0] === 'object')
                    return false;
                if (element.length > 10)
                    return false;
            }
            if (key === 'NOT')
                return false;
        }
    }
    for (const key in filter) {
        if (Object.prototype.hasOwnProperty.call(filter, key)) {
            const element = filter[key];
            if (Array.isArray(element)) {
                if (key.endsWith('.in'))
                    url.add(key, JSON.stringify(element));
                else
                    element.forEach((e) => url.add(key, e));
            }
            else if (key.startsWith(customUrlToken))
                url.add(key, JSON.stringify(element));
            else
                url.add(key, element);
        }
    }
    return true;
}
const liveQueryAction = 'liveQuery-';

const streamUrl = 'stream';
//@internal
class LiveQuerySubscriber {
    repo;
    query;
    sendDefaultState(onResult) {
        onResult(this.createReducerType(() => [...this.defaultQueryState], this.allItemsMessage(this.defaultQueryState)));
    }
    queryChannel;
    subscribeCode;
    unsubscribe = () => { };
    async setAllItems(result) {
        const items = await getRepositoryInternals(this.repo)._fromJsonArray(result, this.query.options);
        this.forListeners((listener) => {
            listener(() => {
                return items;
            });
        }, this.allItemsMessage(items));
    }
    allItemsMessage(items) {
        return [
            {
                type: 'all',
                data: items,
            },
        ];
    }
    forListeners(what, changes) {
        what((reducer) => {
            this.defaultQueryState = reducer(this.defaultQueryState);
            if (changes.find((c) => c.type === 'add' || c.type === 'replace')) {
                if (this.query.options.orderBy) {
                    const o = Sort.translateOrderByToSort(this.repo.metadata, this.query.options.orderBy);
                    this.defaultQueryState.sort((a, b) => o.compare(a, b));
                }
            }
        });
        for (const l of this.listeners) {
            what((reducer) => {
                l.next(this.createReducerType(reducer, changes));
            });
        }
    }
    createReducerType(applyChanges, changes) {
        return {
            applyChanges,
            changes,
            items: this.defaultQueryState,
        };
    }
    async handle(messages) {
        {
            let x = messages.filter(({ type }) => type == 'add' || type == 'replace');
            let loadedItems = await getRepositoryInternals(this.repo)._fromJsonArray(x.map((m) => m.data.item), this.query.options);
            for (let index = 0; index < x.length; index++) {
                const element = x[index];
                element.data.item = loadedItems[index];
            }
        }
        this.forListeners((listener) => {
            listener((items) => {
                if (!items)
                    items = [];
                for (const message of messages) {
                    switch (message.type) {
                        case 'all':
                            this.setAllItems(message.data);
                            break;
                        case 'replace': {
                            items = items.map((x) => this.repo.metadata.idMetadata.getId(x) === message.data.oldId
                                ? message.data.item
                                : x);
                            break;
                        }
                        case 'add':
                            items = items.filter((x) => this.repo.metadata.idMetadata.getId(x) !==
                                this.repo.metadata.idMetadata.getId(message.data.item));
                            items.push(message.data.item);
                            break;
                        case 'remove':
                            items = items.filter((x) => this.repo.metadata.idMetadata.getId(x) !== message.data.id);
                            break;
                    }
                }
                return items;
            });
        }, messages);
    }
    defaultQueryState = [];
    listeners = [];
    id = String(crypto.randomUUID());
    constructor(repo, query, userId) {
        this.repo = repo;
        this.query = query;
        this.queryChannel = `users:${userId}:queries:${this.id}`;
        this.id = this.queryChannel;
    }
}
const liveQueryKeepAliveRoute = '_liveQueryKeepAlive';
//TODO2 - consider moving the queued job mechanism into this.

/* @internal*/
class LiveQueryClient {
    apiProvider;
    getUserId;
    wrapMessageHandling(handleMessage) {
        var x = this.apiProvider().wrapMessageHandling;
        if (x)
            x(handleMessage);
        else
            handleMessage();
    }
    queries = new Map();
    hasQueriesForTesting() {
        return this.queries.size > 0;
    }
    channels = new Map();
    constructor(apiProvider, getUserId) {
        this.apiProvider = apiProvider;
        this.getUserId = getUserId;
    }
    runPromise(p) {
        return p;
    }
    close() {
        this.queries.clear();
        this.channels.clear();
        this.closeIfNoListeners();
    }
    async subscribeChannel(key, onResult) {
        let onUnsubscribe = () => { };
        const client = await this.openIfNoOpened();
        try {
            let q = this.channels.get(key);
            if (!q) {
                this.channels.set(key, (q = new MessageChannel()));
                try {
                    q.unsubscribe = await client.subscribe(key, (value) => this.wrapMessageHandling(() => q.handle(value)), (err) => {
                        onResult.error(err);
                    });
                }
                catch (err) {
                    onResult.error(err);
                    throw err;
                }
            }
            q.listeners.push(onResult);
            onUnsubscribe = () => {
                q.listeners.splice(q.listeners.indexOf(onResult), 1);
                if (q.listeners.length == 0) {
                    this.channels.delete(key);
                    q.unsubscribe();
                }
                this.closeIfNoListeners();
            };
        }
        catch (err) {
            onResult.error(err);
            throw err;
        }
        return () => {
            onUnsubscribe();
            onUnsubscribe = () => { };
        };
    }
    closeIfNoListeners() {
        if (this.client)
            if (this.queries.size === 0 && this.channels.size === 0) {
                this.runPromise(this.client.then((x) => x.close()));
                this.client = undefined;
                clearInterval(this.interval);
                this.interval = undefined;
            }
    }
    subscribe(repo, options, listener) {
        let alive = true;
        let onUnsubscribe = () => {
            alive = false;
        };
        this.runPromise(getRepositoryInternals(repo)
            ._buildEntityDataProviderFindOptions(options)
            .then((opts) => {
            if (!alive)
                return;
            const { createKey, subscribe } = new RestDataProvider(this.apiProvider)
                .getEntityDataProvider(repo.metadata)
                .buildFindRequest(opts);
            const eventTypeKey = createKey();
            let q = this.queries.get(eventTypeKey);
            if (!q) {
                this.queries.set(eventTypeKey, (q = new LiveQuerySubscriber(repo, { entityKey: repo.metadata.key, options }, this.getUserId())));
                q.subscribeCode = () => {
                    if (q.unsubscribe) {
                        q.unsubscribe();
                        q.unsubscribe = () => { };
                    }
                    this.runPromise(this.subscribeChannel(q.queryChannel, {
                        next: (value) => this.runPromise(q.handle(value)),
                        complete: () => { },
                        error: (er) => {
                            q.listeners.forEach((l) => l.error(er));
                        },
                    }).then((unsubscribeToChannel) => {
                        if (q.listeners.length == 0) {
                            unsubscribeToChannel();
                            return;
                        }
                        this.runPromise(subscribe(q.queryChannel)
                            .then((r) => {
                            if (q.listeners.length === 0) {
                                r.unsubscribe();
                                unsubscribeToChannel();
                                return;
                            }
                            this.runPromise(q.setAllItems(r.result));
                            q.unsubscribe = () => {
                                q.unsubscribe = () => { };
                                unsubscribeToChannel();
                                this.runPromise(r.unsubscribe());
                            };
                        })
                            .catch((err) => {
                            q.listeners.forEach((l) => l.error(err));
                            unsubscribeToChannel();
                            this.queries.delete(eventTypeKey);
                        }));
                    })).catch((err) => {
                        q.listeners.forEach((l) => l.error(err));
                    });
                };
                q.subscribeCode();
            }
            else {
                q.sendDefaultState(listener.next);
            }
            q.listeners.push(listener);
            onUnsubscribe = () => {
                q.listeners.splice(q.listeners.indexOf(listener), 1);
                listener.complete();
                if (q.listeners.length == 0) {
                    this.queries.delete(eventTypeKey);
                    q.unsubscribe();
                }
                this.closeIfNoListeners();
            };
        })
            .catch((err) => {
            listener.error(err);
        }));
        return () => {
            onUnsubscribe();
        };
    }
    client;
    interval;
    openIfNoOpened() {
        if (!this.client) {
            this.interval = setInterval(async () => {
                const ids = [];
                for (const q of this.queries.values()) {
                    ids.push(q.queryChannel);
                }
                if (ids.length > 0) {
                    let p = this.apiProvider();
                    const invalidIds = await this.runPromise(await remultStatic.actionInfo.runActionWithoutBlockingUI(() => buildRestDataProvider(p.httpClient).post(p.url + '/' + liveQueryKeepAliveRoute, ids)));
                    for (const id of invalidIds) {
                        for (const q of this.queries.values()) {
                            if (q.queryChannel === id)
                                q.subscribeCode();
                        }
                    }
                }
            }, 30000);
            return this.runPromise((this.client = this.apiProvider().subscriptionClient.openConnection(() => {
                for (const q of this.queries.values()) {
                    q.subscribeCode();
                }
            })));
        }
        return this.client;
    }
}
class MessageChannel {
    unsubscribe = () => { };
    async handle(message) {
        for (const l of this.listeners) {
            l.next(message);
        }
    }
    listeners = [];
    constructor() { }
}

class SseSubscriptionClient {
    openConnection(onReconnect) {
        let connectionId;
        const channels = new Map();
        const provider = buildRestDataProvider(remult.apiClient.httpClient);
        let connected = false;
        let source;
        const client = {
            close() {
                source.close();
            },
            async subscribe(channel, handler) {
                let listeners = channels.get(channel);
                if (!listeners) {
                    channels.set(channel, (listeners = []));
                    await subscribeToChannel(channel);
                }
                listeners.push(handler);
                return () => {
                    listeners.splice(listeners.indexOf(handler, 1));
                    if (listeners.length == 0) {
                        remultStatic.actionInfo.runActionWithoutBlockingUI(() => provider.post(remult.apiClient.url + '/' + streamUrl + '/unsubscribe', {
                            channel: channel,
                            clientId: connectionId,
                        }));
                        channels.delete(channel);
                    }
                };
            },
        };
        const createConnectionPromise = () => new Promise((res) => {
            createConnection();
            let retryCount = 0;
            function createConnection() {
                if (source)
                    source.close();
                source = SseSubscriptionClient.createEventSource(remult.apiClient.url + '/' + streamUrl);
                source.onmessage = (e) => {
                    let message = JSON.parse(e.data);
                    const listeners = channels.get(message.channel);
                    if (listeners)
                        listeners.forEach((x) => x(message.data));
                };
                source.onerror = (e) => {
                    console.error('Live Query Event Source Error', e);
                    source.close();
                    if (retryCount++ < flags.error500RetryCount) {
                        setTimeout(() => {
                            createConnection();
                        }, 500);
                    }
                };
                source.addEventListener('connectionId', async (e) => {
                    //@ts-ignore
                    connectionId = e.data;
                    if (connected) {
                        for (const channel of channels.keys()) {
                            await subscribeToChannel(channel);
                        }
                        onReconnect();
                    }
                    else {
                        connected = true;
                        res(client);
                    }
                });
            }
        });
        return createConnectionPromise();
        async function subscribeToChannel(channel) {
            const result = await remultStatic.actionInfo.runActionWithoutBlockingUI(() => {
                return provider.post(remult.apiClient.url + '/' + streamUrl + '/subscribe', {
                    channel: channel,
                    clientId: connectionId,
                });
            });
            if (result === ConnectionNotFoundError) {
                await createConnectionPromise();
            }
        }
    }
    static createEventSource(url) {
        return new EventSource(url, {
            withCredentials: true,
        });
    }
}
const ConnectionNotFoundError = 'client connection not found';

const serverActionField = Symbol.for('serverActionField');

function initDataProvider(optionsDataProvider, useStaticDefault, defaultDataProvider) {
    let dataProvider;
    if (typeof optionsDataProvider === 'function') {
        dataProvider = optionsDataProvider();
    }
    else
        dataProvider = Promise.resolve(optionsDataProvider);
    dataProvider = dataProvider.then(async (dp) => {
        if (dp)
            return dp;
        if (useStaticDefault)
            dp = await remultStatic.defaultDataProvider();
        if (dp)
            return dp;
        return defaultDataProvider?.();
    });
    return dataProvider;
}

class SubscribableImp {
    reportChanged() {
        if (this._subscribers)
            this._subscribers.forEach((x) => x.reportChanged());
    }
    reportObserved() {
        if (this._subscribers)
            this._subscribers.forEach((x) => x.reportObserved());
    }
    _subscribers;
    subscribe(listener) {
        let list;
        if (typeof listener === 'function')
            list = {
                reportChanged: () => listener(),
                reportObserved: () => { },
            };
        else
            list = listener;
        if (!this._subscribers) {
            this._subscribers = [];
        }
        this._subscribers.push(list);
        return () => (this._subscribers = this._subscribers.filter((x) => x != list));
    }
}

class RemultAsyncLocalStorage {
    remultObjectStorage;
    static enable() {
        remultStatic.remultFactory = () => {
            const r = remultStatic.asyncContext.getStore();
            if (r)
                return r.remult;
            else
                throw new Error('remult object was requested outside of a valid request cycle.valid context, try running `withRemult` or run  within initApi or a remult request cycle');
        };
    }
    static disable() {
        resetFactory();
    }
    constructor(remultObjectStorage) {
        this.remultObjectStorage = remultObjectStorage;
    }
    async run(remult, callback) {
        if (this.remultObjectStorage) {
            return this.remultObjectStorage.run({ remult }, () => callback(remult));
        }
        else
            return callback(remult);
    }
    isInInitRequest() {
        return this.remultObjectStorage?.getStore()?.inInitRequest;
    }
    setInInitRequest(val) {
        const store = this.remultObjectStorage?.getStore();
        if (!store)
            return;
        if (val || this.remultObjectStorage?.isStub)
            store.inInitRequest = val;
    }
    getStore() {
        if (!this.remultObjectStorage) {
            throw new Error("can't use static remult in this environment, `async_hooks` were not initialized");
        }
        return this.remultObjectStorage.getStore();
    }
}
if (!remultStatic.asyncContext)
    remultStatic.asyncContext = new RemultAsyncLocalStorage(undefined);
function isBackend() {
    return remultStatic.actionInfo.runningOnServer || !remult.dataProvider.isProxy;
}
class Remult {
    /**Return's a `Repository` of the specific entity type
     * @example
     * const taskRepo = remult.repo(Task);
     * @see [Repository](https://remult.dev/docs/ref_repository.html)
     * @param entity - the entity to use
     * @param dataProvider - an optional alternative data provider to use. Useful for writing to offline storage or an alternative data provider
     */
    repo = (entity, dataProvider) => {
        let info = getEntitySettings(entity)(remult);
        if (dataProvider === undefined) {
            if (info?.dataProvider) {
                const d = info.dataProvider(this.dataProvider);
                if (d instanceof Promise) {
                    dataProvider = new DataProviderPromiseWrapper(d);
                }
                else {
                    dataProvider = d ?? undefined;
                }
            }
        }
        if (!dataProvider) {
            dataProvider = this.dataProvider;
        }
        let dpCache = this.repCache.get(dataProvider);
        if (!dpCache)
            this.repCache.set(dataProvider, (dpCache = new Map()));
        let r = dpCache.get(entity);
        if (!r) {
            dpCache.set(entity, (r = new RepositoryImplementation(entity, this, dataProvider, createOldEntity(entity, this))));
            verifyFieldRelationInfo(r, this, dataProvider);
        }
        return r;
    };
    _subscribers;
    subscribeAuth(listener) {
        if (!this._subscribers)
            this._subscribers = new SubscribableImp();
        return this._subscribers.subscribe(listener);
    }
    __user;
    /** Returns the current user's info */
    get user() {
        this._subscribers?.reportObserved();
        return this.__user;
    }
    set user(user) {
        this.__user = user;
        this._subscribers?.reportChanged();
    }
    /**
     * Fetches user information from the backend and updates the `remult.user` object.
     * Typically used during application initialization and user authentication.
     *
     * @returns {Promise<UserInfo | undefined>} A promise that resolves to the user's information or `undefined` if unavailable.
     */
    async initUser() {
        const dp = buildRestDataProvider(this.apiClient.httpClient);
        const data = await dp.get(buildFullUrl(this.apiClient.url, 'me'));
        this.user = data?.id != undefined ? data : undefined;
        return this.user;
    }
    /** Checks if a user was authenticated */
    authenticated() {
        return this.user?.id !== undefined;
    }
    /** checks if the user has any of the roles specified in the parameters
     * @example
     * remult.isAllowed("admin")
     * @see
     * [Allowed](https://remult.dev/docs/allowed.html)
     */
    isAllowed(roles) {
        if (roles == undefined)
            return undefined;
        if (roles instanceof Array) {
            for (const role of roles) {
                if (this.isAllowed(role) === true) {
                    return true;
                }
            }
            return false;
        }
        if (typeof roles === 'function') {
            return roles(this);
        }
        if (typeof roles === 'boolean')
            return roles;
        if (typeof roles === 'string')
            if (this.user?.roles?.includes(roles.toString()))
                return true;
        return false;
    }
    /** checks if the user matches the allowedForInstance callback
     * @see
     * [Allowed](https://remult.dev/docs/allowed.html)
     */
    isAllowedForInstance(instance, allowed) {
        if (Array.isArray(allowed)) {
            {
                for (const item of allowed) {
                    if (this.isAllowedForInstance(instance, item))
                        return true;
                }
            }
        }
        else if (typeof allowed === 'function') {
            return allowed(instance, this);
        }
        else
            return this.isAllowed(allowed);
        return undefined;
    }
    useFetch(fetch) {
        this.dataProvider = new RestDataProvider(() => ({
            httpClient: fetch,
        }));
    }
    /** The current data provider */
    dataProvider = new RestDataProvider(() => this.apiClient);
    /* @internal */
    repCache = new Map();
    constructor(provider) {
        if (provider && provider.getEntityDataProvider) {
            this.dataProvider = provider;
            return;
        }
        if (isExternalHttpProvider(provider)) {
            this.apiClient.httpClient = provider;
        }
        else if (typeof provider === 'function')
            this.apiClient.httpClient = provider;
        else if (provider) {
            const apiClient = provider;
            if (apiClient.httpClient)
                this.apiClient.httpClient = apiClient.httpClient;
            if (apiClient.url)
                this.apiClient.url = apiClient.url;
            if (apiClient.subscriptionClient)
                this.apiClient.subscriptionClient = apiClient.subscriptionClient;
            if (apiClient.wrapMessageHandling)
                this.apiClient.wrapMessageHandling = apiClient.wrapMessageHandling;
        }
    }
    liveQueryStorage;
    subscriptionServer;
    /* @internal*/
    liveQueryPublisher = {
        itemChanged: async () => { },
    };
    //@ts-ignore // type error of typescript regarding args that doesn't appear in my normal development
    /** Used to call a `backendMethod` using a specific `remult` object
     * @example
     * await remult.call(TasksController.setAll, undefined, true);
     * @param backendMethod - the backend method to call
     * @param classInstance - the class instance of the backend method, for static backend methods use undefined
     * @param args - the arguments to send to the backend method
     */
    call(backendMethod, classInstance, ...args) {
        const z = backendMethod[serverActionField];
        if (!z.doWork)
            throw Error('The method received is not a valid backend method');
        //@ts-ignore
        return z.doWork(args, classInstance, this.apiClient.url, buildRestDataProvider(this.apiClient.httpClient));
    }
    /* @internal*/
    liveQuerySubscriber = new LiveQueryClient(() => this.apiClient, () => this.user?.id);
    /** A helper callback that can be used to debug and trace all find operations. Useful in debugging scenarios */
    static onFind = (metadata, options) => { };
    clearAllCache() {
        this.repCache.clear();
    }
    /** A helper callback that is called whenever an entity is created. */
    static entityRefInit;
    /**
     * context that can be used to store custom information that will be disposed as part of the `remult` object.
     *
     * `remult.context` is pre-filled in a framework-agnostic way with:
     *   - `headers.get(key: string)` _of request_
     *   - `headers.getAll()` _of request_
     *
     * Check out the [extensibility section](/docs/custom-options#enhancing-field-and-entity-definitions-with-custom-options) for more custom options.
     */
    context = {};
    /** The api client that will be used by `remult` to perform calls to the `api` */
    apiClient = {
        url: '/api',
        subscriptionClient: new SseSubscriptionClient(),
    };
}
remultStatic.defaultRemultFactory = () => new Remult();
class ClassHelper {
    classes = new Map();
}
function setControllerSettings(target, options) {
    let r = target;
    while (true) {
        let helper = remultStatic.classHelpers.get(r);
        if (!helper)
            remultStatic.classHelpers.set(r, (helper = new ClassHelper()));
        helper.classes.set(target, options);
        let p = Object.getPrototypeOf(r.prototype);
        if (p == null)
            break;
        r = p.constructor;
    }
}
const queryConfig = {
    defaultPageSize: 200,
};
async function doTransaction(remult, what) {
    const trans = new transactionLiveQueryPublisher(remult.liveQueryPublisher);
    let ok = true;
    const prev = remult.dataProvider;
    try {
        await remult.dataProvider.transaction(async (ds) => {
            remult.dataProvider = ds;
            remult.liveQueryPublisher = trans;
            await what(ds);
            ok = true;
        });
        if (ok)
            await trans.flush();
    }
    finally {
        remult.dataProvider = prev;
    }
}
class transactionLiveQueryPublisher {
    orig;
    constructor(orig) {
        this.orig = orig;
    }
    transactionItems = new Map();
    async itemChanged(entityKey, changes) {
        let items = this.transactionItems.get(entityKey);
        if (!items) {
            this.transactionItems.set(entityKey, (items = []));
        }
        for (const c of changes) {
            if (c.oldId !== undefined) {
                const item = items.find((y) => y.id === c.oldId);
                if (item !== undefined) {
                    if (c.deleted)
                        item.deleted = true;
                    if (c.id != item.id)
                        item.id = c.id;
                }
                else
                    items.push(c);
            }
            else
                items.push(c);
        }
    }
    async flush() {
        for (const key of this.transactionItems.keys()) {
            await this.orig.itemChanged(key, this.transactionItems.get(key));
        }
    }
}
async function withRemult(callback, options) {
    const remult = new Remult();
    remult.dataProvider = await initDataProvider(options?.dataProvider, true, async () => remult.dataProvider);
    return remultStatic.asyncContext.run(remult, (r) => callback(r));
}

function assign(item, valuesToSet) {
    if (valuesToSet)
        Object.assign(item, valuesToSet);
    return item;
}

class InputTypes {
    static number = 'number';
    static date = 'date';
    static checkbox = 'checkbox';
    static password = 'password';
    static email = 'email';
    static tel = 'tel';
    static time = 'time';
    static json = 'json';
}

const zeroDate = new Date('0000-01-01');
class ValueConverters {
    static Date = {
        toJson: (val) => {
            if (val === null)
                return null;
            if (!val)
                return '';
            if (typeof val === 'string')
                val = new Date(val);
            if (val instanceof Date) {
                return val.toISOString();
            }
            else {
                throw new Error('Expected date but got ' + val);
            }
        },
        fromJson: (val) => {
            if (val === null)
                return null;
            if (val == undefined)
                return undefined;
            if (val == '')
                return undefined;
            if (val.startsWith('0000-00-00'))
                return undefined;
            return new Date(Date.parse(val));
        },
        toDb: (x) => x,
        fromDb: (val) => {
            if (typeof val === 'number')
                val = new Date(val);
            if (typeof val === 'string')
                val = new Date(val);
            if (val && !(val instanceof Date))
                throw 'expected date but got ' + val;
            return val;
        },
        fromInput: (x) => ValueConverters.Date.fromJson(x),
        toInput: (x) => ValueConverters.Date.toJson(x),
        displayValue: (val) => {
            if (!val)
                return '';
            return val.toLocaleString();
        },
    };
    static DateOnly = {
        fromInput: (x) => ValueConverters.DateOnly.fromJson(x),
        toInput: (x) => ValueConverters.DateOnly.toJson(x),
        toJson: (val) => {
            var d = val;
            if (typeof d === 'string' || typeof d === 'number')
                d = new Date(d);
            if (d === undefined)
                return undefined;
            if (!d || d == null)
                return null;
            if (d.getHours() == 0)
                return new Date(d.valueOf() - d.getTimezoneOffset() * 60000)
                    .toISOString()
                    .substring(0, 10);
            else
                return d.toISOString().substring(0, 10);
        },
        fromJson: (value) => {
            if (!value || value == '' || value == '0000-00-00')
                return null;
            if (value == '0000-01-01')
                return zeroDate;
            let d = new Date(Date.parse(value));
            d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
            return d;
        },
        inputType: InputTypes.date,
        toDb: (val) => {
            if (!val)
                return null;
            return ValueConverters.DateOnly.fromJson(ValueConverters.DateOnly.toJson(val));
        }, //when using date storage,  the database expects and returns a date local and every where else we reflect on date iso
        fromDb: (val) => {
            return ValueConverters.Date.fromDb(val);
        },
        fieldTypeInDb: 'date',
        displayValue: (value) => {
            if (!value)
                return '';
            return value.toLocaleDateString(undefined);
        },
    };
    static DateOnlyString = {
        ...ValueConverters.DateOnly,
        fieldTypeInDb: 'char(8)',
        toDb: (d) => {
            if (d === zeroDate)
                return '00000000';
            let val = ValueConverters.DateOnly.toJson(d);
            if (!val)
                return undefined;
            return val.replace(/-/g, '');
        },
        fromDb: (val) => {
            if (val === null)
                return null;
            if (!val)
                return undefined;
            if (val === '00000000')
                return zeroDate;
            return new Date(Number(val.substring(0, 4)), Number(val.substring(4, 6)) - 1, Number(val.substring(6, 8)));
        },
        zeroDate,
    };
    static Boolean = {
        toDb: (val) => val,
        inputType: InputTypes.checkbox,
        fromDb: (value) => {
            return ValueConverters.Boolean.fromJson(value);
        },
        fromJson: (value) => {
            if (typeof value === 'boolean')
                return value;
            if (value === 1)
                return true;
            if (value !== undefined && value !== null) {
                return value.toString().trim().toLowerCase() == 'true';
            }
            return value;
        },
        toJson: (x) => x,
        fromInput: (x) => ValueConverters.Boolean.fromJson(x),
        toInput: (x) => ValueConverters.Boolean.toJson(x),
    };
    static Number = {
        fromDb: (value) => {
            if (value === null)
                return null;
            if (value !== undefined)
                return +value;
            return undefined;
        },
        toDb: (value) => value,
        fromJson: (value) => ValueConverters.Number.fromDb(value),
        toJson: (value) => ValueConverters.Number.toDb(value),
        fromInput: (x, type) => {
            let r = +x;
            if (x === null)
                return null;
            if (x === undefined)
                return undefined;
            return r;
        },
        toInput: (x, type) => {
            return x?.toString() ?? '';
        },
        inputType: InputTypes.number,
    };
    static String = {
        fromDb: enforceString,
        toDb: enforceString,
        fromJson: enforceString,
        toJson: enforceString,
        fromInput: enforceString,
        toInput: enforceString,
    };
    static Integer = {
        ...ValueConverters.Number,
        toJson: (value) => {
            let val = ValueConverters.Number.toDb(value);
            if (!val)
                return val;
            return +(+val).toFixed(0);
        },
        toDb: (value) => ValueConverters.Integer.toJson(value),
        fieldTypeInDb: 'integer',
    };
    static Default = {
        fromJson: (x) => x,
        toJson: (x) => x,
        fromDb: (x) => ValueConverters.JsonString.fromDb(x),
        toDb: (x) => ValueConverters.JsonString.toDb(x),
        fromInput: (x) => ValueConverters.Default.fromJson(x),
        toInput: (x) => ValueConverters.Default.toJson(x),
        toDbSql: (x) => x,
        displayValue: (x) => x + '',
        fieldTypeInDb: '',
        inputType: 'text',
    };
    static JsonString = {
        fromJson: (x) => x,
        toJson: (x) => x,
        fromDb: (x) => x == null
            ? null
            : x
                ? JSON.parse(ValueConverters.JsonString.fromJson(x))
                : undefined,
        toDb: (x) => x !== undefined
            ? x === null
                ? null
                : JSON.stringify(ValueConverters.JsonString.toJson(x))
            : undefined,
        fromInput: (x) => ValueConverters.JsonString.fromJson(x),
        toInput: (x) => ValueConverters.JsonString.toJson(x),
    };
    static JsonValue = {
        fromJson: (x) => x,
        toJson: (x) => x,
        fromDb: (x) => x,
        toDb: (x) => x,
        fromInput: (x) => ValueConverters.JsonString.fromJson(x),
        toInput: (x) => ValueConverters.JsonString.toJson(x),
        fieldTypeInDb: 'json',
    };
}
function enforceString(value) {
    if (value === null || value === undefined)
        return value;
    if (typeof value !== 'string')
        return value.toString();
    return value;
}

function __updateEntityBasedOnWhere(entityDefs, where, r) {
    let w = Filter.fromEntityFilter(entityDefs, where);
    const emptyFunction = () => { };
    if (w) {
        w.__applyToConsumer({
            custom: emptyFunction,
            databaseCustom: emptyFunction,
            containsCaseInsensitive: emptyFunction,
            notContainsCaseInsensitive: emptyFunction,
            startsWithCaseInsensitive: emptyFunction,
            endsWithCaseInsensitive: emptyFunction,
            isDifferentFrom: emptyFunction,
            isEqualTo: (col, val) => {
                r[col.key] = val;
            },
            isGreaterOrEqualTo: emptyFunction,
            isGreaterThan: emptyFunction,
            isIn: emptyFunction,
            isLessOrEqualTo: emptyFunction,
            isLessThan: emptyFunction,
            isNotNull: emptyFunction,
            isNull: emptyFunction,
            not: emptyFunction,
            or: emptyFunction,
        });
    }
}

class RelationLoader {
    entityLoaders = new Map();
    promises = [];
    load(rel, findOptions) {
        let e = this.entityLoaders.get(rel.entityType);
        if (!e) {
            this.entityLoaders.set(rel.entityType, (e = new EntityLoader(rel)));
        }
        const p = e.find(findOptions);
        this.promises.push(p);
        return p;
    }
    constructor() { }
    async resolveAll() {
        for (const entity of this.entityLoaders.values()) {
            for (const variation of entity.queries.values()) {
                variation.resolve();
            }
        }
        if (this.promises.length === 0)
            return;
        const x = this.promises;
        this.promises = [];
        await Promise.all(x);
        await this.resolveAll();
    }
}
class EntityLoader {
    rel;
    queries = new Map();
    find(findOptions) {
        const { where, ...options } = findOptionsToJson(findOptions, this.rel.metadata);
        const optionKeys = JSON.stringify(options);
        let q = this.queries.get(optionKeys);
        if (!q) {
            this.queries.set(optionKeys, (q = new QueryVariation(this.rel)));
        }
        return q.find(findOptions, where);
    }
    constructor(rel) {
        this.rel = rel;
    }
}
class QueryVariation {
    rel;
    find(findOptions, where) {
        const whereKey = JSON.stringify(where);
        let w = this.whereVariations.get(whereKey);
        if (!w) {
            const keys = Object.keys(where);
            if (keys.length === 1 &&
                typeof where[keys[0]] !== 'object' &&
                !findOptions.limit // because merging calls in that case may bring non more rows than the limit
            ) {
                let inVariation = this.pendingInStatements.get(keys[0]);
                if (!inVariation) {
                    this.pendingInStatements.set(keys[0], (inVariation = new PendingInStatements(this.rel, keys[0], findOptions)));
                }
                this.whereVariations.set(whereKey, (w = {
                    result: inVariation.find(where),
                }));
            }
            else {
                this.whereVariations.set(whereKey, (w = {
                    result: this.rel.find(findOptions),
                }));
            }
        }
        return w.result;
    }
    constructor(rel) {
        this.rel = rel;
    }
    resolve() {
        const statements = [...this.pendingInStatements.values()];
        this.pendingInStatements.clear();
        for (const statement of statements) {
            statement.resolve();
        }
    }
    pendingInStatements = new Map();
    whereVariations = new Map();
}
class PendingInStatements {
    rel;
    key;
    options;
    async resolve() {
        const values = [...this.values.values()];
        if (values.length == 1) {
            this.rel.find(this.options).then(values[0].resolve, values[0].reject);
            return;
        }
        var op = { ...this.options };
        op.where = { [this.key]: values.map((v) => v.value) };
        op.limit = 1000;
        op.page = 1;
        let vals = [];
        try {
            while (true) {
                const val = await this.rel.find(op);
                vals.push(...val);
                if (val.length < op.limit)
                    break;
                op.page++;
            }
            for (const value of this.values.values()) {
                value.resolve(vals.filter((x) => {
                    const ref = getEntityRef(x);
                    const field = ref.fields.find(this.key);
                    const rel = getRelationFieldInfo(field.metadata);
                    const val = rel?.type === 'reference'
                        ? field.getId()
                        : x[this.key];
                    return value.value == val;
                }));
            }
        }
        catch (err) {
            for (const value of this.values.values()) {
                value.reject(err);
            }
        }
    }
    find(where) {
        const val = where[this.key];
        let valHandler = this.values.get(val);
        if (!valHandler) {
            let resolve;
            let reject;
            let result = new Promise((resolve1, reject1) => {
                resolve = resolve1;
                reject = reject1;
            });
            this.values.set(val, (valHandler = {
                value: val,
                resolve: resolve,
                reject: reject,
                result,
            }));
        }
        return valHandler.result;
    }
    values = new Map();
    constructor(rel, key, options) {
        this.rel = rel;
        this.key = key;
        this.options = options;
    }
}

async function entityDbName(metadata, wrapIdentifier = (x) => x) {
    if (metadata.options.sqlExpression) {
        if (typeof metadata.options.sqlExpression === 'string')
            return metadata.options.sqlExpression;
        else if (typeof metadata.options.sqlExpression === 'function') {
            const prev = metadata.options.sqlExpression;
            try {
                metadata.options.sqlExpression =
                    "recursive sqlExpression call for entity '" + metadata.key + "'. ";
                return await prev(metadata);
            }
            finally {
                metadata.options.sqlExpression = prev;
            }
        }
    }
    return wrapIdentifier(metadata.dbName);
}

const sqlExpressionInProgressKey = Symbol.for(`sqlExpressionInProgressKey`);
const originalSqlExpressionKey = Symbol.for(`originalSqlExpressionKey`);
async function fieldDbName(f, meta, wrapIdentifier = (x) => x, forceSqlExpression = false) {
    try {
        if (f.options.sqlExpression) {
            let result;
            if (typeof f.options.sqlExpression === 'function') {
                if (f[sqlExpressionInProgressKey] && !forceSqlExpression) {
                    return "recursive sqlExpression call for field '" + f.key + "'. \0";
                }
                try {
                    ;
                    f[sqlExpressionInProgressKey] = true;
                    if (!f[originalSqlExpressionKey])
                        f[originalSqlExpressionKey] = f.options.sqlExpression;
                    result = await f.options.sqlExpression(meta, undefined, undefined);
                    if (!result.includes('\0'))
                        f.options.sqlExpression = () => result;
                }
                finally {
                    delete f[sqlExpressionInProgressKey];
                }
            }
            else
                result = f.options.sqlExpression;
            if (!result)
                return f.dbName;
            return result;
        }
        const rel = getRelationFieldInfo(f);
        let field = rel?.type === 'toOne' &&
            f.options.field;
        if (field) {
            let fInfo = meta.fields.find(field);
            if (fInfo)
                return fieldDbName(fInfo, meta, wrapIdentifier, forceSqlExpression);
        }
        return wrapIdentifier(f.dbName);
    }
    finally {
    }
}

/**
 * Class containing various field validators.
 */
class Validators {
    /**
     * Validator to check if a value is required (not null or empty).
     */
    static required = createValidator(async (_, e) => !e.valueIsNull() &&
        e.value !== '' &&
        (e.value !== undefined || getRelationFieldInfo(e.metadata) !== undefined), 'Should not be empty');
    /**
     * Validator to ensure a value is unique in the database.
     */
    static unique = createValidator(async (_, e) => {
        if (!e.entityRef)
            throw 'unique validation may only work on columns that are attached to an entity';
        if (e.isBackend() && (e.isNew || e.valueChanged())) {
            return ((await e.entityRef.repository.count({
                [e.metadata.key]: e.value,
            })) == 0);
        }
        else
            return true;
    }, 'already exists');
    /**
     * @deprecated use `unique` instead - it also runs only on the backend
     * Validator to ensure a value is unique on the backend.
     */
    static uniqueOnBackend = createValidator(async (_, e) => {
        if (e.isBackend() && (e.isNew || e.valueChanged())) {
            return ((await e.entityRef.repository.count({
                [e.metadata.key]: e.value,
            })) == 0);
        }
        else
            return true;
    }, Validators.unique.defaultMessage);
    /**
     * Validator to check if a value matches a given regular expression.
     */
    static regex = createValueValidatorWithArgs((val, regex) => regex.test(val));
    /**
     * Validator to check if a value is a valid email address.
     */
    static email = createValueValidator((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Invalid Email');
    /**
     * Validator to check if a value is a valid URL.
     */
    static url = createValueValidator((val) => !!new URL(val), 'Invalid Url');
    /**
     * Validator to check if a value is one of the specified values.
     */
    static in = createValueValidatorWithArgs((val, values) => values.includes(val), (values) => `Value must be one of: ${values
        .map((y) => typeof y === 'object'
        ? y?.['id'] !== undefined
            ? y?.['id']
            : y?.toString()
        : y)
        .join(', ')}`);
    /**
     * Validator to check if a value is not null.
     */
    static notNull = createValueValidator((val) => val != null, 'Should not be null');
    /**
     * Validator to check if a value exists in a given enum.
     */
    static enum = createValueValidatorWithArgs((value, enumObj) => Object.values(enumObj).includes(value), (enumObj) => `Value must be one of ${getEnumValues(enumObj).join(', ')}`);
    /**
     * Validator to check if a related value exists in the database. By side-effect it loads relation data so it is directly available in [lifecycle hooks](https://remult.dev/docs/lifecycle-hooks)
     */
    static relationExists = createValidator(async (_, e) => {
        if (e.valueIsNull())
            return true;
        if (!e.isBackend())
            return true;
        return Boolean(await e.load());
    }, 'Relation value does not exist');
    /**
     * Validator to check if a value is greater than or equal to a minimum value.
     */
    static min = createValueValidatorWithArgs((val, minValue) => val >= minValue, (minValue) => `Value must be bigger than or equal to ${minValue}`);
    /**
     * Validator to check if a value is less than or equal to a maximum value.
     */
    static max = createValueValidatorWithArgs((val, maxValue) => val <= maxValue, (maxValue) => `Value must be smaller than or equal to ${maxValue}`);
    /**
     * Validator to check if a string's length is less than or equal to a maximum length.
     */
    static maxLength = createValueValidatorWithArgs((val, maxLength) => val.length <= maxLength, (maxLength) => `Value must be at most ${maxLength} characters`);
    /**
     * Validator to check if a string's length is greater than or equal to a minimum length.
     */
    static minLength = createValueValidatorWithArgs((val, minLength) => val.length >= minLength, (maxLength) => `Value must be at least ${maxLength} characters`);
    /**
    * Validator to check if a value is within a specified range.
    */
    static range = createValueValidatorWithArgs((val, [minValue, maxValue]) => val >= minValue && val <= maxValue, ([minValue, maxValue]) => `Value must be between ${minValue} and ${maxValue}`);
    static defaultMessage = 'Invalid value';
}
/**
 * Function to create a validator with a custom validation function.
 */
function createValidator(validate, defaultMessage) {
    const validation = async (entity, e, message) => {
        const valid = await validate(entity, e);
        if (typeof valid === 'string' && valid.length > 0)
            e.error = valid;
        else if (!valid)
            e.error =
                (typeof message === 'function' && message(entity, e, undefined)) ||
                    message ||
                    (typeof defaultMessage === 'function' &&
                        defaultMessage(entity, e, undefined)) ||
                    defaultMessage ||
                    Validators.defaultMessage;
    };
    const result = (entityOrMessage, e, message) => {
        if (typeof entityOrMessage === 'string' ||
            entityOrMessage === 'function' ||
            (entityOrMessage === undefined && e === undefined)) {
            return async (entity, e, message) => await validation(entity, e, entityOrMessage || message);
        }
        return validation(entityOrMessage, e, message);
    };
    Object.defineProperty(result, 'defaultMessage', {
        get: () => {
            return defaultMessage;
        },
        set: (val) => {
            defaultMessage = val;
        },
        enumerable: true,
    });
    //@ts-ignore
    return Object.assign(result, {
        withMessage: (message) => async (entity, e) => result(entity, e, message),
    });
}
/**
 * Function to create a value validator with arguments.
 */
function createValueValidator(validate, defaultMessage) {
    return createValidator((_, e) => {
        if (e.value === undefined || e.value === null)
            return true;
        return validate(e.value);
    }, defaultMessage);
}
/**
 * Function to create a value validator with arguments and a custom message.
 */
function createValueValidatorWithArgs(validate, defaultMessage) {
    const result = createValidatorWithArgsInternal((_, e, args) => {
        if (e.value === undefined || e.value === null)
            return true;
        return validate(e.value, args);
    }, (_, e, args) => (typeof defaultMessage === 'function' && defaultMessage(args)) ||
        defaultMessage, true);
    return Object.assign((entity, e) => result(entity, e), {
        get defaultMessage() {
            return defaultMessage;
        },
        set defaultMessage(val) {
            defaultMessage = val;
        },
    });
}
function createValidatorWithArgsInternal(validate, defaultMessage, isValueValidator = false) {
    const result = (args, message) => async (entity, e) => {
        const valid = await validate(entity, e, args);
        if (typeof valid === 'string')
            e.error = valid;
        else if (!valid)
            e.error = message
                ? typeof message === 'function'
                    ? isValueValidator
                        ? message(args)
                        : message(entity, e, args)
                    : message
                : defaultMessage
                    ? typeof defaultMessage === 'function'
                        ? defaultMessage(entity, e, args)
                        : defaultMessage
                    : Validators.defaultMessage;
    };
    return Object.assign(result, {
        get defaultMessage() {
            return defaultMessage;
        },
        set defaultMessage(val) {
            defaultMessage = val;
        },
    });
}
/**
 * Function to get the values of an enum.
 */
function getEnumValues(enumObj) {
    return Object.values(enumObj).filter((x) => typeof enumObj[x] !== 'number');
}

function addValidator(validators, newValidator, atStart = false) {
    if (!newValidator)
        return validators;
    const newValidators = Array.isArray(newValidator)
        ? newValidator
        : [newValidator];
    const validatorsArray = Array.isArray(validators)
        ? validators
        : validators
            ? [validators]
            : [];
    return atStart
        ? [...newValidators, ...validatorsArray]
        : [...validatorsArray, ...newValidators];
}

function isOfType(obj, checkMethod) {
    return typeof obj[checkMethod] !== 'undefined';
}
function cast(obj, checkMethod) {
    if (isOfType(obj, checkMethod)) {
        return obj;
    }
    throw new Error(`Object is not of type ${checkMethod.toString()}`);
}

class QueryResultImpl {
    options;
    repo;
    constructor(options, repo) {
        this.options = options;
        this.repo = repo;
        if (!this.options)
            this.options = {};
        if (!this.options.pageSize) {
            this.options.pageSize = queryConfig.defaultPageSize;
        }
    }
    _count = undefined;
    _aggregates;
    async getPage(page) {
        if ((page ?? 0) < 1)
            page = 1;
        return this.repo.find({
            where: this.options.where,
            orderBy: this.options.orderBy,
            limit: this.options.pageSize,
            page: page,
            load: this.options.load,
            include: this.options.include,
        });
    }
    async count() {
        if (this._count === undefined)
            this._count = await this.repo.count(this.options.where);
        return this._count;
    }
    async forEach(what) {
        let i = 0;
        for await (const x of this) {
            await what(x);
            i++;
        }
        return i;
    }
    async paginator(pNextPageFilter) {
        this.options.orderBy = Sort.createUniqueEntityOrderBy(this.repo.metadata, this.options.orderBy);
        let options = {
            where: {
                $and: [this.options.where, pNextPageFilter],
            },
            orderBy: this.options.orderBy,
            limit: this.options.pageSize,
            load: this.options.load,
            include: this.options.include,
        };
        let getItems = () => this.repo.find(options);
        if (this._aggregates === undefined &&
            isOfType(this.options, 'aggregate')) {
            let agg = this.options.aggregate;
            if (!this.repo._dataProvider.isProxy) {
                let itemsPromise = getItems();
                getItems = async () => {
                    this._aggregates = await this.repo.aggregate({
                        ...agg,
                        where: this.options.where,
                    });
                    this._count = this._aggregates.$count;
                    return itemsPromise;
                };
            }
            else {
                const loader = new RelationLoader();
                getItems = () => this.repo
                    ._rawFind(options, false, loader, async (opt) => {
                    const r = await this.repo._edp.query(opt, await this.repo.__buildGroupByOptions(agg));
                    this._aggregates = r.aggregates;
                    return r.items;
                })
                    .then(async (y) => {
                    await loader.resolveAll();
                    return y;
                });
            }
        }
        let items = await getItems();
        let nextPage = () => {
            throw new Error('no more pages');
        };
        let hasNextPage = items.length == this.options.pageSize;
        if (hasNextPage) {
            let nextPageFilter = await this.repo._createAfterFilter(this.options.orderBy, items[items.length - 1]);
            nextPage = () => this.paginator(nextPageFilter);
        }
        return {
            count: () => this.count(),
            hasNextPage,
            items,
            nextPage,
            //@ts-ignore
            aggregates: this._aggregates,
        };
    }
    [Symbol.asyncIterator]() {
        if (!this.options.where) {
            this.options.where = {};
        }
        let ob = this.options.orderBy;
        this.options.orderBy = Sort.createUniqueEntityOrderBy(this.repo.metadata, ob);
        let itemIndex = -1;
        let currentPage = undefined;
        let itStrategy;
        let j = 0;
        itStrategy = async () => {
            if (this.options.progress) {
                this.options.progress.progress(j++ / (await this.count()));
            }
            if (currentPage === undefined || itemIndex == currentPage.items.length) {
                if (currentPage && !currentPage.hasNextPage)
                    return { value: undefined, done: true };
                let prev = currentPage;
                if (currentPage)
                    currentPage = await currentPage.nextPage();
                else
                    currentPage = await this.paginator();
                itemIndex = 0;
                if (currentPage.items.length == 0) {
                    return { value: undefined, done: true };
                }
                else {
                    if (prev?.items.length ?? 0 > 0) {
                        if (this.repo.getEntityRef(prev.items[0]).getId() ==
                            this.repo.getEntityRef(currentPage.items[0]).getId())
                            throw new Error('pagination failure, returned same first row');
                    }
                }
            }
            if (itemIndex < currentPage.items.length)
                return { value: currentPage.items[itemIndex++], done: false };
            return { done: true, value: undefined };
        };
        return {
            next: async () => {
                let r = itStrategy();
                return r;
            },
        };
    }
}

// import ("class-validator".toString())
//     .then((v) => {
//         classValidatorValidate = (item, ref) => {
//             return v.validate(item).then(errors => {
//                 for (const err of errors) {
//                     for (const key in err.constraints) {
//                         if (Object.prototype.hasOwnProperty.call(err.constraints, key)) {
//                             const element = err.constraints[key];
//                             ref.fields.find(err.property).error = element;
//                         }
//                     }
//                 }
//             });
//         }
//     })
//     .catch(() => {
//     });
class RepositoryImplementation {
    _entity;
    _remult;
    _dataProvider;
    _info;
    _defaultFindOptions;
    _notFoundError(id) {
        return {
            message: `id ${id} not found in entity ${this.metadata.key}`,
            httpStatusCode: 404,
        };
    }
    [getInternalKey]() {
        return this;
    }
    async _createAfterFilter(orderBy, lastRow) {
        let values = new Map();
        for (const s of Sort.translateOrderByToSort(this.metadata, orderBy)
            .Segments) {
            let existingVal = lastRow[s.field.key];
            // if (typeof existingVal !== "string" && typeof existingVal !== "number") {
            // }
            // else {
            //     let ei = getEntitySettings(s.field.valueType, false);
            //     if (ei) {
            //         existingVal = await this.remult.repo(s.field.valueType).findId(existingVal);
            //     }
            // }
            values.set(s.field.key, existingVal);
        }
        let r = { $or: [] };
        let equalToColumn = [];
        for (const s of Sort.translateOrderByToSort(this.metadata, orderBy)
            .Segments) {
            let f = {};
            for (const c of equalToColumn) {
                f[c.key] = values.get(c.key);
            }
            equalToColumn.push(s.field);
            if (s.isDescending) {
                f[s.field.key] = { $lt: values.get(s.field.key) };
            }
            else
                f[s.field.key] = { $gt: values.get(s.field.key) };
            r.$or.push(f);
        }
        return r;
    }
    relations(item) {
        return new Proxy({}, {
            get: (target, key) => {
                const field = this.fields.find(key);
                const rel = getRelationFieldInfo(field);
                if (!rel)
                    throw Error(key + ' is not a relation');
                const { toRepo, returnNull, returnUndefined } = this._getFocusedRelationRepo(field, item);
                if (rel.type === 'toMany')
                    return toRepo;
                else
                    return {
                        findOne: (options) => {
                            if (returnNull)
                                return Promise.resolve(null);
                            if (returnUndefined)
                                return Promise.resolve(undefined);
                            return toRepo.findFirst({}, options);
                        },
                    };
            },
        });
    }
    _getFocusedRelationRepo(field, item) {
        const rel = getRelationFieldInfo(field);
        let repo = rel.toRepo;
        let { findOptions, returnNull, returnUndefined } = this._findOptionsBasedOnRelation(rel, field, undefined, item, repo);
        const toRepo = new RepositoryImplementation(repo._entity, repo._remult, repo._dataProvider, repo._info, findOptions);
        return { toRepo, returnNull, returnUndefined };
    }
    __edp;
    get _edp() {
        return this.__edp
            ? this.__edp
            : (this.__edp = this._dataProvider.getEntityDataProvider(this.metadata));
    }
    constructor(_entity, _remult, _dataProvider, _info, _defaultFindOptions) {
        this._entity = _entity;
        this._remult = _remult;
        this._dataProvider = _dataProvider;
        this._info = _info;
        this._defaultFindOptions = _defaultFindOptions;
    }
    async aggregate(options) {
        return (await this.groupBy(options))[0];
    }
    async groupBy(options) {
        var dpOptions = await this.__buildGroupByOptions(options);
        const result = await this._edp.groupBy(dpOptions);
        //@ts-ignore
        if (!options?.[GroupByForApiKey] && options.group) {
            const loaderOptions = {
                include: {},
            };
            for (const key of options.group) {
                loaderOptions.include[key] = true;
            }
            const loader = new RelationLoader();
            await this._populateRelationsForFields(dpOptions.group, loaderOptions, result, loader);
            await loader.resolveAll();
        }
        return result;
    }
    async __buildGroupByOptions(options) {
        let findOptions = await this._buildEntityDataProviderFindOptions({
            ...options,
        });
        const getField = (key) => {
            const r = this.metadata.fields.find(key);
            if (r === undefined)
                throw Error(`key "${key}" not found in entity`);
            return r;
        };
        const getFieldNotInGroupBy = (key) => {
            if (options?.group?.includes(key))
                throw Error(`field "${key}" cannot be used both in an aggregate and in group by`);
            return getField(key);
        };
        var dpOptions = {
            where: findOptions.where,
            limit: findOptions.limit,
            page: findOptions.page,
            group: options?.group?.map(getField),
            sum: options?.sum?.map(getFieldNotInGroupBy),
            avg: options?.avg?.map(getFieldNotInGroupBy),
            min: options?.min?.map(getFieldNotInGroupBy),
            max: options?.max?.map(getFieldNotInGroupBy),
            distinctCount: options?.distinctCount?.map(getFieldNotInGroupBy),
        };
        if (options?.orderBy) {
            dpOptions.orderBy = [];
            for (const key in options.orderBy) {
                if (Object.prototype.hasOwnProperty.call(options?.orderBy, key)) {
                    const element = options.orderBy[key];
                    if (element)
                        if (typeof element === 'string') {
                            dpOptions.orderBy.push({
                                field: key === '$count' ? undefined : getField(key),
                                isDescending: element === 'desc',
                                operation: key === '$count' ? 'count' : undefined,
                            });
                        }
                        else {
                            for (const operation in element) {
                                if (Object.prototype.hasOwnProperty.call(element, operation)) {
                                    const direction = element[operation];
                                    dpOptions.orderBy.push({
                                        field: this.metadata.fields.find(key),
                                        isDescending: direction === 'desc',
                                        operation: operation,
                                    });
                                }
                            }
                        }
                }
            }
        }
        return dpOptions;
    }
    _idCache = new Map();
    _getCachedById(id, doNotLoadIfNotFound) {
        id = id + '';
        this._getCachedByIdAsync(id, doNotLoadIfNotFound);
        let r = this._idCache.get(id);
        if (r instanceof Promise)
            return undefined;
        return r;
    }
    async _getCachedByIdAsync(id, doNotLoadIfNotFound) {
        id = id + '';
        let r = this._idCache.get(id);
        if (r instanceof Promise)
            return await r;
        if (this._idCache.has(id)) {
            return r;
        }
        if (doNotLoadIfNotFound)
            return undefined;
        this._idCache.set(id, undefined);
        let row = this.findId(id).then((row) => {
            if (row === undefined) {
                r = null;
            }
            else
                r = row;
            this._idCache.set(id, r);
            return r;
        });
        this._idCache.set(id, row);
        return await row;
    }
    _addToCache(item) {
        if (item)
            this._idCache.set(this.getEntityRef(item).getId() + '', item);
    }
    get metadata() {
        return this._info;
    }
    listeners;
    addEventListener(listener) {
        if (!this.listeners)
            this.listeners = [];
        this.listeners.push(listener);
        return () => {
            this.listeners.splice(this.listeners.indexOf(listener), 1);
        };
    }
    query(options) {
        return new QueryResultImpl(options, this);
    }
    getEntityRef(entity) {
        let x = entity[entityMember];
        if (!x) {
            this._fixTypes(entity);
            x = new rowHelperImplementation(this._info, entity, this, this._edp, this._remult, true);
            Object.defineProperty(entity, entityMember, {
                //I've used define property to hide this member from console.lo g
                get: () => x,
            });
            x.saveOriginalData();
        }
        return x;
    }
    async delete(item) {
        const ref = getEntityRef(item, false);
        if (ref)
            return ref.delete();
        if (typeof item === 'string' || typeof item === 'number')
            if (this._dataProvider.isProxy)
                return this._edp.delete(item);
            else {
                let ref2 = await this.findId(item);
                if (!ref2)
                    throw this._notFoundError(item);
                return await getEntityRef(ref2).delete();
            }
        let ref2 = this._getRefForExistingRow(item, undefined);
        if (!this._dataProvider.isProxy)
            await ref2.reload();
        return ref2.delete();
    }
    __cleanupPartialObject(item) {
        const keys = Object.keys(item);
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            const field = this.fields[key];
            if (field) {
                const rel = getRelationFieldInfo(field);
                if (rel && rel.type === 'toOne' && rel.options.field) {
                    let fieldIndex = keys.indexOf(rel.options.field);
                    if (fieldIndex > index) {
                        let relId = rel.toRepo.getEntityRef(item[key]).getId();
                        if (relId !== item[rel.options.field]) {
                            delete item[key];
                        }
                    }
                }
            }
        }
        for (const key in item) {
            if (Object.prototype.hasOwnProperty.call(item, key)) {
                item[key];
                getRelationFieldInfo(this.fields[key]);
            }
        }
        for (const field of this.fields) {
        }
    }
    async insert(entity, options) {
        if (Array.isArray(entity)) {
            if (this._dataProvider.isProxy) {
                let refs = [];
                let raw = [];
                for (const item of entity) {
                    this.__cleanupPartialObject(item);
                    let ref = getEntityRef(entity, false);
                    if (ref) {
                        if (!ref.isNew())
                            throw 'Item is not new';
                    }
                    else {
                        ref = (await this.getEntityRef(this.create(item)));
                    }
                    refs.push(ref);
                    raw.push(await ref.buildDtoForInsert());
                }
                const inserted = await this._edp.insertMany(raw, options);
                if (options?.select === 'none')
                    return undefined;
                return promiseAll(inserted, (item, i) => refs[i].processInsertResponseDto(item));
            }
            else {
                let r = [];
                for (const item of entity) {
                    r.push(await this.insert(item, options));
                }
                if (options?.select === 'none')
                    return undefined;
                return r;
            }
        }
        else {
            let ref = getEntityRef(entity, false);
            let result = undefined;
            if (ref) {
                if (!ref.isNew())
                    throw 'Item is not new';
                result = await ref.save(options);
            }
            else {
                this.__cleanupPartialObject(entity);
                result = await this.getEntityRef(this.create(entity)).save(options);
            }
            if (options?.select === 'none')
                return undefined;
            return result;
        }
    }
    get fields() {
        return this.metadata.fields;
    }
    async validate(entity, ...fields) {
        {
            let ref = getEntityRef(entity, false);
            if (!ref)
                ref = this.getEntityRef({ ...entity });
            if (!fields || fields.length === 0) {
                return await ref.validate();
            }
            else {
                ref.__clearErrorsAndReportChanged();
                let hasError = false;
                for (const f of fields) {
                    if (!(await ref.fields.find(f).validate()))
                        hasError = true;
                }
                if (!hasError)
                    return undefined;
                return ref.buildErrorInfoObject();
            }
        }
    }
    __createDto(basedOn) {
        this.__cleanupPartialObject(basedOn);
        const ref = this.getEntityRef({
            ...basedOn,
        });
        const r = ref.copyDataToObject(false);
        const keys = Object.keys(basedOn);
        for (const element of this.fields) {
            if (element.dbReadOnly || !keys.includes(element.key))
                delete r[element.key];
        }
        return r;
    }
    async updateMany({ where, set, }) {
        this.__cleanupPartialObject(set);
        Filter.throwErrorIfFilterIsEmpty(where, 'updateMany');
        if (this._dataProvider.isProxy) {
            return this._edp.updateMany(where === 'all' ? 'all' : await this._translateWhereToFilter(where), this.__createDto({ ...set }));
        }
        else {
            let updated = 0;
            if (where === 'all')
                where = undefined;
            for await (const item of this.query({ where, aggregate: undefined })) {
                assign(item, set);
                await getEntityRef(item).save({ select: 'none' });
                updated++;
            }
            return updated;
        }
    }
    async update(id, entity, options) {
        function returnResult(result) {
            if (options?.select === 'none')
                return undefined;
            return result;
        }
        {
            let ref = getEntityRef(entity, false);
            if (ref)
                return returnResult((await ref.save(options)));
        }
        {
            let ref = getEntityRef(id, false);
            if (ref) {
                assign(id, entity);
                return returnResult(await ref.save(options));
            }
        }
        this.__cleanupPartialObject(entity);
        let ref;
        if (typeof id === 'object') {
            ref = this._getRefForExistingRow(id, this.metadata.idMetadata.getId(id));
            Object.assign(ref.instance, entity);
        }
        else
            ref = this._getRefForExistingRow(entity, id);
        if (this._dataProvider.isProxy) {
            return returnResult(await ref.save(options, Object.keys(entity)));
        }
        else {
            const r = await ref.reload();
            if (!r)
                throw this._notFoundError(ref.id);
            for (const key in entity) {
                if (Object.prototype.hasOwnProperty.call(entity, key)) {
                    let f = ref.fields[key];
                    if (entity[key] === undefined && getRelationFieldInfo(f.metadata))
                        continue;
                    //@ts-ignore
                    if (f)
                        r[key] = entity[key];
                }
            }
            await this._fixTypes(r);
            return returnResult(await ref.save(options));
        }
    }
    async upsert(options) {
        if (this._dataProvider.isProxy) {
            let rawRows = await this._edp.upsertMany((Array.isArray(options) ? options : [options]).map((x) => {
                if (this._defaultFindOptions?.where) {
                    __updateEntityBasedOnWhere(this.metadata, this._defaultFindOptions.where, x.where);
                    this._fixTypes(x);
                }
                return {
                    where: this.__createDto(x.where),
                    set: x.set ? this.__createDto(x.set) : undefined,
                };
            }));
            const loader = new RelationLoader();
            const result = await this._loadManyToOneForManyRows(rawRows, {}, loader);
            await loader.resolveAll();
            if (Array.isArray(options))
                return result;
            else
                return result[0];
        }
        if (Array.isArray(options)) {
            return promiseAll(options, (x) => this.upsert(x));
        }
        let op = options;
        var row = await this.findFirst(op.where, { createIfNotFound: true });
        var ref = getEntityRef(row, false);
        if (ref.isNew()) {
            if (op.set) {
                assign(row, op.set);
            }
            return await ref.save();
        }
        else {
            if (op.set) {
                assign(row, op.set);
                return await ref.save();
            }
            return row;
        }
    }
    _getRefForExistingRow(entity, id) {
        let ref = getEntityRef(entity, false);
        if (!ref) {
            const instance = new this._entity(this._remult);
            for (const field of this._fieldsOf(entity)) {
                const key = field.key;
                instance[key] = entity[key];
            }
            this._fixTypes(instance);
            let row = new rowHelperImplementation(this._info, instance, this, this._edp, this._remult, false);
            if (typeof id === 'object')
                id = this.metadata.idMetadata.getId(id);
            if (id) {
                row.id = id;
                row.originalId = id;
            }
            else
                row.id = row.getId();
            ref = row;
            Object.defineProperty(instance, entityMember, {
                get: () => row,
            });
        }
        return ref;
    }
    async save(entity, options) {
        if (Array.isArray(entity)) {
            return promiseAll(entity, (x) => this.save(x));
        }
        else {
            let ref = getEntityRef(entity, false);
            if (ref)
                return await ref.save(options);
            else if (entity instanceof EntityBase) {
                return await this.getEntityRef(entity).save(options);
            }
            else {
                let id = this.metadata.idMetadata.getId(entity);
                if (id === undefined)
                    return this.insert(entity, options);
                return this.update(id, entity, options);
            }
        }
    }
    liveQuery(options) {
        if (!options)
            options = {};
        return {
            subscribe: (l) => {
                let listener = l;
                if (typeof l === 'function') {
                    listener = {
                        next: l,
                        complete: () => { },
                        error: () => { },
                    };
                }
                listener.error ??= () => { };
                listener.complete ??= () => { };
                return this._remult.liveQuerySubscriber.subscribe(//TODO - figure out why the type was required
                this, options, listener);
            },
        };
    }
    async _rawFind(options, skipOrderByAndLimit = false, loader, actualFind) {
        if (!options)
            options = {};
        if (this._defaultFindOptions) {
            options = { ...this._defaultFindOptions, ...options };
        }
        let opt = await this._buildEntityDataProviderFindOptions(options);
        if (skipOrderByAndLimit) {
            delete opt.orderBy;
            delete opt.limit;
        }
        Remult.onFind(this._info, options);
        const rawRows = await actualFind(opt);
        let result = await this._loadManyToOneForManyRows(rawRows, options, loader);
        return result;
    }
    async find(options, skipOrderByAndLimit = false) {
        const loader = new RelationLoader();
        const result = await this._rawFind(options, skipOrderByAndLimit, loader, (x) => this._edp.find(x));
        await loader.resolveAll();
        return result;
    }
    async _buildEntityDataProviderFindOptions(options) {
        options = { ...options };
        let opt = {};
        opt = {};
        if (options.args)
            opt.args = options.args;
        if (options.select) {
            opt.select = Object.keys(options.select)
                .filter((x) => options.select[x])
                .map((x) => {
                let f = this.metadata.fields.find(x);
                const r = getRelationFieldInfo(f);
                if (r) {
                    throw new Error(`select is not allowed for relation field ${x} in entity ${this.metadata.label}, use include instead`);
                }
                if (!f)
                    throw new Error(`Field ${x} not found in entity ${this.metadata.label}`);
                return f.key;
            });
        }
        if (!options.orderBy || Object.keys(options.orderBy).length === 0) {
            if (!this._dataProvider.isProxy)
                options.orderBy = this._info.entityInfo.defaultOrderBy;
        }
        opt.where = await this._translateWhereToFilter(options.where);
        if (options.orderBy !== undefined)
            opt.orderBy = Sort.translateOrderByToSort(this.metadata, options.orderBy);
        if (options.limit !== undefined)
            opt.limit = options.limit;
        if (options.page !== undefined)
            opt.page = options.page;
        return opt;
    }
    async _fromJsonArray(jsonItems, loadOptions) {
        const loader = new RelationLoader();
        const result = await this._loadManyToOneForManyRows(jsonItems.map((row) => {
            let result = {};
            for (const col of this.metadata.fields.toArray()) {
                result[col.key] = col.valueConverter.fromJson(row[col.key]);
            }
            return result;
        }), loadOptions, loader);
        await loader.resolveAll();
        return result;
    }
    async _loadManyToOneForManyRows(rawRows, loadOptions, loader) {
        let loadFields = undefined;
        if (loadOptions?.load)
            loadFields = loadOptions.load(this.metadata.fields);
        for (const col of this.metadata.fields) {
            let ei = getEntitySettings(col.valueType, false);
            if (ei) {
                let isRelation = getRelationFieldInfo(col);
                if (!isRelation) {
                    let load = !col.options.lazy;
                    if (loadFields !== undefined)
                        load = loadFields.includes(col);
                    if (load) {
                        let repo = this._remult.repo(col.valueType);
                        let toLoad = [];
                        for (const r of rawRows) {
                            let val = r[col.key];
                            if (val !== undefined &&
                                val !== null &&
                                !toLoad.includes(val) &&
                                !repo._idCache.has(val + '')) {
                                toLoad.push(val);
                            }
                        }
                        if (toLoad.length > 0) {
                            await loadManyToOne(repo, toLoad);
                        }
                    }
                }
            }
        }
        async function loadManyToOne(repo, toLoad) {
            let rows = await repo.find({ where: repo.metadata.idMetadata.getIdFilter(...toLoad) }, true);
            for (const r of rows) {
                repo._addToCache(r);
            }
        }
        const excludeRelationMembers = new Set(this.fields
            .toArray()
            .map((f) => {
            const i = this.__getRelationAndInclude(f, loadOptions);
            if (i.rel && !i.incl)
                return f.key;
            return undefined;
        })
            .filter((x) => x !== undefined));
        let result = await promiseAll(rawRows, async (r) => await this._mapRawDataToResult(r, loadFields, excludeRelationMembers));
        const fields = this.metadata.fields.toArray();
        this._populateRelationsForFields(fields, loadOptions, result, loader);
        return result;
    }
    _populateRelationsForFields(fields, loadOptions, result, loader) {
        for (const col of fields) {
            let { rel, incl } = this.__getRelationAndInclude(col, loadOptions);
            if (rel)
                if (incl) {
                    const otherRepo = rel.toRepo;
                    for (const row of result) {
                        let { findOptions, returnNull, returnUndefined } = this._findOptionsBasedOnRelation(rel, col, incl, row, otherRepo);
                        const colKey = col.key;
                        if (returnNull)
                            row[colKey] = null;
                        else if (returnUndefined)
                            row[colKey] = undefined;
                        else {
                            const entityType = rel.toEntity;
                            const toRepo = otherRepo;
                            loader
                                .load({
                                entityType,
                                find: (options) => toRepo._rawFind(options, false, loader, (o) => toRepo._edp.find(o)),
                                metadata: toRepo.metadata,
                            }, findOptions)
                                .then((result) => {
                                if (result.length == 0 && rel.type == 'toOne')
                                    return;
                                row[colKey] =
                                    rel.type !== 'toMany'
                                        ? result.length == 0
                                            ? null
                                            : result[0]
                                        : result;
                            });
                        }
                    }
                }
                else {
                    for (const row of result) {
                        Reflect.deleteProperty(row, col.key);
                    }
                }
        }
    }
    __getRelationAndInclude(col, loadOptions) {
        let rel = getRelationFieldInfo(col);
        let incl = col.options
            .defaultIncluded;
        const include = loadOptions?.include?.[col.key];
        if (include !== undefined) {
            incl = include;
        }
        return { rel, incl };
    }
    /*@internal */
    _findOptionsBasedOnRelation(rel, field, moreFindOptions, row, otherRepo) {
        let returnNull = false;
        let returnUndefined = false;
        let where = [];
        let findOptions = {};
        let findOptionsSources = [];
        if (typeof rel.options.findOptions === 'function') {
            findOptionsSources.push(rel.options.findOptions(row));
        }
        else if (typeof rel.options.findOptions === 'object')
            findOptionsSources.push(rel.options.findOptions);
        if (typeof moreFindOptions === 'object') {
            findOptionsSources.push(moreFindOptions);
        }
        for (const source of findOptionsSources) {
            if (source.where)
                where.push(source.where);
            for (const key of [
                'limit',
                'include',
                'orderBy',
                'select',
            ]) {
                //@ts-ignore
                if (source[key])
                    findOptions[key] = source[key];
            }
        }
        const relFields = rel.getFields();
        const getFieldValue = (key) => {
            const ref = getEntityRef(row, false);
            let val = rel.type === 'reference' && ref
                ? ref.fields.find(field.key).getId()
                : row[key];
            if (rel.type === 'toOne' || rel.type === 'reference') {
                if (val === null)
                    returnNull = true;
                else if (val === undefined)
                    returnUndefined = true;
                else if (rel.type === 'reference' && typeof val === 'object')
                    val = otherRepo.metadata.idMetadata.getId(val);
            }
            return val;
        };
        if (relFields.compoundIdField)
            if (rel.type === 'toMany') {
                where.push({
                    [relFields.compoundIdField]: this.metadata.idMetadata.getId(row),
                });
            }
            else {
                where.push(otherRepo.metadata.idMetadata.getIdFilter(getFieldValue(relFields.compoundIdField)));
            }
        for (const key in relFields.fields) {
            if (Object.prototype.hasOwnProperty.call(relFields.fields, key)) {
                const val = getFieldValue(relFields.fields[key]);
                if (val === null)
                    returnNull = true;
                else if (val === undefined)
                    returnUndefined = true;
                else
                    where.push({ [key]: val });
            }
        }
        findOptions.where = { $and: where };
        if ((rel.type === 'toOne' || rel.type === 'reference') &&
            findOptions.orderBy // I deduce from this that there may be more than one row and we want only the first
        )
            findOptions.limit = 1;
        return { findOptions, returnNull, returnUndefined };
    }
    async _mapRawDataToResult(r, loadFields, excludeRelationMembers) {
        let x = new this._entity(this._remult);
        let helper = new rowHelperImplementation(this._info, x, this, this._edp, this._remult, false, excludeRelationMembers);
        Object.defineProperty(x, entityMember, {
            //I've used define property to hide this member from console.lo g
            get: () => helper,
        });
        await helper.loadDataFrom(r, loadFields);
        helper.saveOriginalData();
        return x;
    }
    toJson(item) {
        if (item === undefined || item === null)
            return item;
        if (Array.isArray(item))
            return item.map((x) => this.toJson(x));
        if (typeof item.then === 'function')
            return item.then((x) => this.toJson(x));
        return this.getEntityRef(item).toApiJson(true);
    }
    fromJson(json, newRow) {
        if (json === null || json === undefined)
            return json;
        if (Array.isArray(json))
            return json.map((item) => this.fromJson(item, newRow));
        let result = new this._entity(this._remult);
        for (const col of this._fieldsOf(json)) {
            const colKey = col.key;
            let ei = getEntitySettings(col.valueType, false);
            if (ei) {
                let val = json[col.key];
                if (typeof val === 'string' || typeof val === 'number')
                    result[colKey] = val;
                else
                    result[colKey] = this._remult.repo(col.valueType).fromJson(val);
            }
            else {
                if (json[colKey] !== undefined) {
                    result[colKey] = col.valueConverter.fromJson(json[col.key]);
                }
            }
        }
        this._fixTypes(result);
        if (newRow) {
            return this.create(result);
        }
        else {
            let row = new rowHelperImplementation(this._info, result, this, this._edp, this._remult, false);
            Object.defineProperty(result, entityMember, {
                //I've used define property to hide this member from console.lo g
                get: () => row,
            });
            row.id = row.getId();
            row.saveOriginalData();
            row.originalId = row.id;
            return result;
        }
    }
    async count(where) {
        return this._edp.count(await this._translateWhereToFilter(where));
    }
    async deleteMany({ where, }) {
        Filter.throwErrorIfFilterIsEmpty(where, 'deleteMany');
        if (this._dataProvider.isProxy) {
            return this._edp.deleteMany(where === 'all' ? 'all' : await this._translateWhereToFilter(where));
        }
        else {
            let deleted = 0;
            if (where === 'all')
                where = undefined;
            for await (const item of this.query({ where, aggregate: undefined })) {
                await getEntityRef(item).delete();
                deleted++;
            }
            return deleted;
        }
    }
    _cache = new Map();
    async findOne(pOptions, skipOrderByAndLimit = false) {
        let r;
        let cacheInfo;
        let options = pOptions ?? {};
        if (options.useCache) {
            let f = findOptionsToJson(options, this.metadata);
            let key = JSON.stringify(f);
            cacheInfo = this._cache.get(key);
            if (cacheInfo !== undefined) {
                if (cacheInfo.value &&
                    this.getEntityRef(cacheInfo.value).wasDeleted()) {
                    cacheInfo = undefined;
                    this._cache.delete(key);
                }
                else
                    return cacheInfo.promise;
            }
            else {
                cacheInfo = {
                    value: undefined,
                    promise: undefined,
                };
                this._cache.set(key, cacheInfo);
            }
        }
        r = this.find({ ...options, limit: 1 }, skipOrderByAndLimit).then(async (items) => {
            let r = undefined;
            if (items.length > 0)
                r = items[0];
            if (!r && options.createIfNotFound) {
                r = this.create();
                if (options.where) {
                    await __updateEntityBasedOnWhere(this.metadata, options.where, r);
                }
            }
            return r;
        });
        if (cacheInfo) {
            cacheInfo.promise = r = r.then((r) => {
                cacheInfo.value = r;
                return r;
            });
        }
        return r;
    }
    async findFirst(where, options, skipOrderByAndLimit = false) {
        if (!options)
            options = {};
        if (where) {
            if (options.where) {
                let w = options.where;
                options.where = {
                    $and: [w, where],
                };
            }
            else
                options.where = where;
        }
        return this.findOne(options, skipOrderByAndLimit);
    }
    _fieldsOf(item) {
        let keys = Object.keys(item);
        return this.metadata.fields.toArray().filter((x) => keys.includes(x.key));
    }
    create(item) {
        let r = new this._entity(this._remult);
        if (item) {
            for (const field of this._fieldsOf(item)) {
                const key = field.key;
                r[key] = item[key];
            }
            this._fixTypes(r);
        }
        if (this._defaultFindOptions?.where) {
            __updateEntityBasedOnWhere(this.metadata, this._defaultFindOptions.where, r);
            this._fixTypes(r);
        }
        this.getEntityRef(r);
        return r;
    }
    async _fixTypes(item) {
        for (const field of this._fieldsOf(item)) {
            const val = item[field.key];
            if (val !== null && val !== undefined) {
                if (field.valueType === Date && !(val instanceof Date))
                    item[field.key] = field.valueConverter.fromJson(field.valueConverter.toJson(val));
                else
                    for (const [type, typeName] of [
                        [String, 'string'],
                        [Number, 'number'],
                        [Boolean, 'boolean'],
                    ]) {
                        if (field.valueType === type && typeof val !== typeName)
                            item[field.key] = field.valueConverter.fromJson(field.valueConverter.toJson(val));
                    }
            }
        }
        return item;
    }
    findId(id, options) {
        if (id === null || id === undefined)
            return Promise.resolve(null);
        if (typeof id !== 'string' && typeof id !== 'number')
            throw new Error('id can be either number or string, but got: ' + typeof id);
        return this.findFirst({}, {
            ...options,
            where: this.metadata.idMetadata.getIdFilter(id),
        }, true);
    }
    async _translateWhereToFilter(where) {
        let safeWhere = where ?? {};
        if (this._defaultFindOptions?.where) {
            let z = safeWhere;
            safeWhere = {
                $and: [z, this._defaultFindOptions?.where],
            };
        }
        if (!this._dataProvider.isProxy) {
            if (this.metadata.options.backendPreprocessFilter) {
                safeWhere = await this.metadata.options.backendPreprocessFilter(safeWhere, {
                    metadata: this.metadata,
                    getFilterPreciseValues: (filter) => Filter.getPreciseValues(this.metadata, filter || safeWhere),
                });
            }
            if (this.metadata.options.backendPrefilter) {
                let z = safeWhere;
                safeWhere = {
                    $and: [
                        z,
                        await Filter.resolve(this.metadata.options.backendPrefilter),
                    ],
                };
            }
        }
        let r = await Filter.fromEntityFilter(this.metadata, safeWhere);
        if (r && !this._dataProvider.isProxy) {
            r = await Filter.translateCustomWhere(r, this.metadata, this._remult);
        }
        return r;
    }
}
function createOldEntity(entity, remult) {
    let r = remultStatic.columnsOfType.get(entity);
    if (!r)
        remultStatic.columnsOfType.set(entity, (r = []));
    let info = getEntitySettings(entity)(remult);
    let key = getEntityKey(entity);
    let base = Object.getPrototypeOf(entity);
    while (base != null) {
        let baseCols = remultStatic.columnsOfType.get(base);
        if (baseCols) {
            r.unshift(...baseCols.filter((x) => !r.find((y) => y.key == x.key)));
        }
        let baseSettingsFactory = getEntitySettings(base, false);
        if (baseSettingsFactory) {
            let baseSettings = baseSettingsFactory(remult);
            info = { ...baseSettings, ...info };
            let functions = [
                'saving',
                'saved',
                'deleting',
                'deleted',
                'validation',
            ];
            for (const key of functions) {
                if (baseSettings[key] && baseSettings[key] !== info[key]) {
                    let x = info[key];
                    //@ts-ignore
                    info[key] = async (a, b) => {
                        //@ts-ignore
                        await x(a, b);
                        //@ts-ignore
                        await baseSettings[key](a, b);
                    };
                }
            }
        }
        base = Object.getPrototypeOf(base);
    }
    return new EntityFullInfo(prepareColumnInfo(r, remult), info, remult, entity, key);
}
class rowHelperBase {
    fieldsMetadata;
    instance;
    remult;
    isNewRow;
    _error;
    get error() {
        this._subscribers?.reportObserved();
        return this._error;
    }
    set error(val) {
        this._error = val;
        this._subscribers?.reportChanged();
    }
    constructor(fieldsMetadata, instance, remult, isNewRow, excludeRelationMembers) {
        this.fieldsMetadata = fieldsMetadata;
        this.instance = instance;
        this.remult = remult;
        this.isNewRow = isNewRow;
        {
            let fac = remult;
            if (fac != null && fac.iAmRemultProxy) {
                remult = remultStatic.remultFactory();
            }
        }
        for (const col of fieldsMetadata) {
            let ei = getEntitySettings(col.valueType, false);
            if (ei && remult) {
                let lookup = new LookupColumn(remult.repo(col.valueType), Boolean(getRelationFieldInfo(col)), col.allowNull);
                this.lookups.set(col.key, lookup);
                let val = instance[col.key];
                let refImpl;
                Object.defineProperty(instance, col.key, {
                    get: () => {
                        if (this._subscribers) {
                            this._subscribers.reportObserved();
                            if (!refImpl) {
                                refImpl = this.fields.find(col.key);
                                if (!refImpl._subscribers) {
                                    refImpl._subscribers = new SubscribableImp();
                                }
                            }
                            refImpl._subscribers.reportObserved();
                        }
                        return lookup.item;
                    },
                    set: (val) => {
                        lookup.set(val);
                        this._subscribers?.reportChanged();
                        if (!refImpl) {
                            refImpl = this.fields.find(col.key);
                            if (!refImpl._subscribers) {
                                refImpl._subscribers = new SubscribableImp();
                            }
                        }
                        refImpl._subscribers.reportChanged();
                    },
                    enumerable: !excludeRelationMembers?.has(col.key),
                });
                lookup.set(val);
            }
            else {
                const rel = getRelationFieldInfo(col);
                if (rel?.type === 'toOne') {
                    let hasVal = instance.hasOwnProperty(col.key);
                    let val = instance[col.key];
                    if (isNewRow && !val)
                        hasVal = false;
                    Object.defineProperty(instance, col.key, {
                        get: () => {
                            return val;
                        },
                        set: (newVal) => {
                            val = newVal;
                            if (newVal === undefined)
                                return;
                            const op = col.options;
                            if (op.field) {
                                this.instance[op.field] =
                                    rel.toRepo.metadata.idMetadata.getId(newVal);
                            }
                            if (op.fields) {
                                for (const key in op.fields) {
                                    if (Object.prototype.hasOwnProperty.call(op.fields, key)) {
                                        const element = op.fields[key];
                                        this.instance[element] =
                                            newVal == null ? null : newVal[key];
                                    }
                                }
                            }
                        },
                        enumerable: !excludeRelationMembers?.has(col.key),
                    });
                    if (hasVal)
                        instance[col.key] = val;
                }
            }
        }
    }
    _subscribers;
    subscribe(listener) {
        this.initSubscribers();
        return this._subscribers.subscribe(listener);
    }
    _isLoading = false;
    initSubscribers() {
        if (!this._subscribers) {
            this._subscribers = new SubscribableImp();
            const safeSubscribers = this._subscribers;
            for (const col of this.fieldsMetadata) {
                let ei = getEntitySettings(col.valueType, false);
                let refImpl = this.fields.find(col.key);
                refImpl._subscribers = new SubscribableImp();
                if ((ei && this.remult) || getRelationFieldInfo(col)) ;
                else {
                    let val = this.instance[col.key];
                    Object.defineProperty(this.instance, col.key, {
                        get: () => {
                            safeSubscribers.reportObserved();
                            refImpl._subscribers.reportObserved();
                            return val;
                        },
                        set: (value) => {
                            val = value;
                            safeSubscribers.reportChanged();
                            refImpl._subscribers.reportChanged();
                        },
                        enumerable: true,
                    });
                }
            }
        }
    }
    get isLoading() {
        this._subscribers?.reportObserved();
        return this._isLoading;
    }
    set isLoading(val) {
        this._isLoading = val;
        this._subscribers?.reportChanged();
    }
    lookups = new Map();
    async waitLoad() {
        await promiseAll([...this.lookups.values()], (x) => x.waitLoad());
    }
    errors;
    __assertValidity() {
        if (!this.hasErrors())
            throw this.buildErrorInfoObject();
    }
    buildErrorInfoObject() {
        let error = {
            modelState: Object.assign({}, this.errors),
            message: this.error,
        };
        if (!error.message) {
            for (const col of this.fieldsMetadata) {
                if (this.errors?.[col.key]) {
                    error.message =
                        this.fields[col.key].metadata.label +
                            ': ' +
                            this.errors[col.key];
                    this.error = error.message;
                    break;
                }
            }
        }
        return new EntityError(error);
    }
    catchSaveErrors(err) {
        let e = err;
        if (e instanceof Promise) {
            return e.then((x) => this.catchSaveErrors(x));
        }
        if (e.error) {
            e = e.error;
        }
        if (e.message)
            this.error = e.message;
        else if (e.Message)
            this.error = e.Message;
        else
            this.error = e;
        let s = e.modelState;
        if (!s)
            s = e.ModelState;
        if (s) {
            this.errors = s;
        }
        throw err;
    }
    __clearErrorsAndReportChanged() {
        this.errors = undefined;
        this.error = undefined;
        this._reportChangedToEntityAndFields();
    }
    _reportChangedToEntityAndFields() {
        if (this._subscribers) {
            this._subscribers.reportChanged();
            for (const field of this.fields) {
                let ref = field;
                ref._subscribers.reportChanged();
            }
        }
    }
    hasErrors() {
        this._subscribers?.reportObserved();
        return !!!this.error && this.errors == undefined;
    }
    copyDataToObject(isNew = false) {
        let d = {};
        for (const col of this.fieldsMetadata) {
            let lu = this.lookups.get(col.key);
            let val = undefined;
            const rel = getRelationFieldInfo(col);
            if (lu)
                val = lu.id;
            else
                val = this.instance[col.key];
            if (rel &&
                isNew &&
                !col.allowNull &&
                (val === undefined || val === null)) {
                if (rel.toRepo.metadata.idMetadata.field.valueType === Number)
                    val = 0;
                else
                    val = '';
            }
            if (!rel || rel.type === 'reference') {
                if (val !== undefined) {
                    val = col.valueConverter.toJson(val);
                    if (val !== undefined && val !== null)
                        val = col.valueConverter.fromJson(JSON.parse(JSON.stringify(val)));
                }
                d[col.key] = val;
            }
        }
        return d;
    }
    originalValues = {};
    saveOriginalData() {
        this.originalValues = this.copyDataToObject();
        this.saveMoreOriginalData();
    }
    saveMoreOriginalData() { }
    async validate() {
        this.__clearErrorsAndReportChanged();
        await this.__performColumnAndEntityValidations();
        this.hasErrors();
        if (!this.hasErrors())
            return this.buildErrorInfoObject();
        else
            return undefined;
    }
    async __validateEntity() {
        this.__clearErrorsAndReportChanged();
        await this.__performColumnAndEntityValidations();
        this.__assertValidity();
    }
    async __performColumnAndEntityValidations() { }
    toApiJson(includeRelatedEntities = false, notJustApi = false) {
        let result = {};
        for (const col of this.fieldsMetadata) {
            if (notJustApi || !this.remult || col.includedInApi(this.instance)) {
                let val;
                let lu = this.lookups.get(col.key);
                let disable = false;
                if (lu)
                    if (includeRelatedEntities) {
                        val = lu.toJson();
                        disable = true;
                        result[col.key] = val;
                    }
                    else
                        val = lu.id;
                else {
                    if (getRelationFieldInfo(col) && !includeRelatedEntities) {
                        disable = true;
                    }
                    else {
                        val = this.instance[col.key];
                        if (!this.remult) {
                            if (val) {
                                let eo = getEntitySettings(val.constructor, false);
                                if (eo) {
                                    val = getEntityRef(val).getId();
                                }
                            }
                        }
                    }
                }
                if (!disable)
                    result[col.key] = col.valueConverter.toJson(val);
            }
        }
        return result;
    }
    async _updateEntityBasedOnApi(body, ignoreApiAllowed = false) {
        let keys = Object.keys(body);
        for (const col of this.fieldsMetadata) {
            if (keys.includes(col.key))
                if (col.includedInApi(this.instance)) {
                    if (!this.remult ||
                        ignoreApiAllowed ||
                        col.apiUpdateAllowed(this.instance)) {
                        let lu = this.lookups.get(col.key);
                        if (lu)
                            lu.id = body[col.key];
                        else
                            this.instance[col.key] = col.valueConverter.fromJson(body[col.key]);
                    }
                }
        }
        await promiseAll([...this.fields].filter((f) => !getRelationFieldInfo(f.metadata)), (x) => x.load());
    }
}
class rowHelperImplementation extends rowHelperBase {
    info;
    repo;
    edp;
    _isNew;
    async _updateResultsFromServerAction(rowInfo) {
        await this._updateEntityBasedOnApi(rowInfo.data, true);
        if (this._isNew != rowInfo.isNewRow) {
            this._isNew = rowInfo.isNewRow;
            this.originalId = rowInfo.id;
        }
        if (!rowInfo.wasChanged)
            this.originalValues = this.copyDataToObject();
    }
    constructor(info, instance, repo, edp, remult, _isNew, excludeRelationMembers) {
        super(info.fieldsMetadata, instance, remult, _isNew, excludeRelationMembers);
        this.info = info;
        this.repo = repo;
        this.edp = edp;
        this._isNew = _isNew;
        this.repository = repo;
        this.metadata = info;
        if (_isNew) {
            for (const col of info.fieldsMetadata) {
                const colKey = col.key;
                if (col.options.defaultValue && instance[colKey] === undefined) {
                    if (typeof col.options.defaultValue === 'function') {
                        instance[colKey] = col.options.defaultValue(instance);
                    }
                    else if (!instance[colKey])
                        instance[colKey] = col.options.defaultValue;
                }
            }
        }
        if (this.info.entityInfo.entityRefInit)
            this.info.entityInfo.entityRefInit(this, instance);
        if (Remult.entityRefInit)
            Remult.entityRefInit(this, instance);
    }
    repository;
    clone() {
        const data = this.toApiJson(true, true);
        return this.repo.fromJson(data, this.isNew());
    }
    get relations() {
        return this.repo.relations(this.instance);
    }
    get apiUpdateAllowed() {
        return this.remult.isAllowedForInstance(this.instance, this.metadata.options.allowApiUpdate);
    }
    get apiDeleteAllowed() {
        return this.remult.isAllowedForInstance(this.instance, this.metadata.options.allowApiDelete);
    }
    get apiInsertAllowed() {
        return this.remult.isAllowedForInstance(this.instance, this.metadata.options.allowApiInsert);
    }
    metadata;
    getId() {
        const getVal = (y) => {
            let z = this.lookups.get(y.key);
            if (z)
                return z.id;
            return this.instance[y.key];
        };
        if (this.metadata.idMetadata.field instanceof CompoundIdField)
            return this.metadata.idMetadata.field.getId(getVal);
        return getVal(this.metadata.idMetadata.field);
    }
    saveMoreOriginalData() {
        this.originalId = this.getId();
    }
    _wasDeleted = false;
    wasDeleted() {
        this._subscribers?.reportObserved();
        return this._wasDeleted;
    }
    undoChanges() {
        this.loadDataFrom(this.originalValues);
        this.__clearErrorsAndReportChanged();
    }
    async reload() {
        await this.edp
            .find({ where: await this.getIdFilter() })
            .then(async (newData) => {
            if (newData.length === 0)
                throw this.repo._notFoundError(this.id);
            await this.loadDataFrom(newData[0]);
            this.saveOriginalData();
        });
        this._reportChangedToEntityAndFields();
        return this.instance;
    }
    _columns;
    get fields() {
        if (!this._columns) {
            let _items = [];
            let r = {
                //@ts-ignore
                find: (c) => 
                //@ts-ignore
                r[typeof c === 'string' ? c : c.key],
                [Symbol.iterator]: () => _items[Symbol.iterator](),
                toArray: () => _items,
            };
            for (const c of this.info.fieldsMetadata) {
                _items.push(
                //@ts-ignore
                (r[c.key] = new FieldRefImplementation(c.options, c, this.instance, this, this)));
            }
            this._columns = r;
        }
        return this._columns;
    }
    _saving = false;
    async save(options, onlyTheseFieldsSentOnlyInTheCaseOfProxySaveWithPartialObject) {
        try {
            if (this._saving)
                throw new Error('cannot save while entity is already saving');
            this._saving = true;
            if (this.wasDeleted())
                throw new Error('cannot save a deleted row');
            this.isLoading = true;
            if (onlyTheseFieldsSentOnlyInTheCaseOfProxySaveWithPartialObject ===
                undefined)
                // no need
                await this.__validateEntity();
            let doNotSave = false;
            let e = this.buildLifeCycleEvent(() => (doNotSave = true));
            if (!this.repo._dataProvider.isProxy) {
                for (const col of this.fields) {
                    if (col.metadata.options.saving)
                        await col.metadata.options.saving(this.instance, col, e);
                }
                if (this.info.entityInfo.saving) {
                    await this.info.entityInfo.saving(this.instance, e);
                }
            }
            this.__assertValidity();
            let d = this.copyDataToObject(this.isNew());
            let ignoreKeys = [];
            for (const field of this.metadata.fields) {
                if (field.dbReadOnly ||
                    (onlyTheseFieldsSentOnlyInTheCaseOfProxySaveWithPartialObject !==
                        undefined &&
                        !onlyTheseFieldsSentOnlyInTheCaseOfProxySaveWithPartialObject.includes(field.key))) {
                    d[field.key] = undefined;
                    ignoreKeys.push(field.key);
                    let f = this.fields.find(field);
                    f.value = f.originalValue;
                }
            }
            //if (this.info.idMetadata.field instanceof CompoundIdField) delete d.id
            let updatedRow;
            let isNew = this.isNew();
            try {
                this._subscribers?.reportChanged();
                if (this.isNew()) {
                    if (doNotSave && options?.select !== 'none') {
                        updatedRow = (updatedRow = await this.edp.find({
                            where: await this.getIdFilter(),
                        }))[0];
                    }
                    else
                        updatedRow = await this.edp.insert(d, options);
                }
                else {
                    let changesOnly = {};
                    let wasChanged = false;
                    for (const key in d) {
                        if (Object.prototype.hasOwnProperty.call(d, key)) {
                            const element = d[key];
                            if (this.fields.find(key).valueChanged() &&
                                !ignoreKeys.includes(key) &&
                                element !== undefined) {
                                changesOnly[key] = element;
                                wasChanged = true;
                            }
                        }
                    }
                    if (!wasChanged)
                        return this.instance;
                    if (doNotSave) {
                        if (options?.select !== 'none')
                            updatedRow = (await this.edp.find({ where: await this.getIdFilter() }))[0];
                    }
                    else {
                        if (this.id === undefined)
                            throw new Error('Invalid operation, id is undefined');
                        updatedRow = await this.edp.update(this.id, changesOnly, options);
                    }
                }
                if (updatedRow)
                    await this.loadDataFrom(updatedRow);
                e.id = this.getId();
                if (!this.repo._dataProvider.isProxy) {
                    if (this.info.entityInfo.saved)
                        await this.info.entityInfo.saved(this.instance, e);
                    if (this.repo.listeners)
                        for (const listener of this.repo.listeners) {
                            await listener.saved?.(this.instance, isNew);
                        }
                }
                this.repo._remult.liveQueryPublisher.itemChanged(this.repo.metadata.key, [{ id: this.getId(), oldId: this.getOriginalId(), deleted: false }]);
                this.saveOriginalData();
                this._isNew = false;
                return this.instance;
            }
            catch (err) {
                throw await this.catchSaveErrors(err);
            }
        }
        finally {
            this.isLoading = false;
            this._reportChangedToEntityAndFields();
            this._saving = false;
        }
    }
    async processInsertResponseDto(updatedRow) {
        await this.loadDataFrom(updatedRow);
        this.saveOriginalData();
        this._isNew = false;
        return this.instance;
    }
    async buildDtoForInsert() {
        await this.__validateEntity();
        this.__assertValidity();
        let d = this.copyDataToObject(this.isNew());
        for (const field of this.metadata.fields) {
            if (field.dbReadOnly) {
                d[field.key] = undefined;
                let f = this.fields.find(field);
                f.value = f.originalValue;
            }
        }
        return d;
    }
    buildLifeCycleEvent(preventDefault = () => { }) {
        const self = this;
        return {
            isNew: self.isNew(),
            fields: self.fields,
            id: self.getId(),
            originalId: self.getOriginalId(),
            metadata: self.repo.metadata,
            repository: self.repo,
            preventDefault: () => preventDefault(),
            relations: self.repo.relations(self.instance),
        };
    }
    async getIdFilter() {
        return await this.repo._translateWhereToFilter(this.repo.metadata.idMetadata.getIdFilter(this.id));
    }
    async delete() {
        this.__clearErrorsAndReportChanged();
        let doDelete = true;
        let e = this.buildLifeCycleEvent(() => (doDelete = false));
        if (!this.repo._dataProvider.isProxy) {
            if (this.info.entityInfo.deleting)
                await this.info.entityInfo.deleting(this.instance, e);
        }
        this.__assertValidity();
        try {
            if (doDelete) {
                if (this.id === undefined)
                    throw new Error('Invalid operation, id is undefined');
                await this.edp.delete(this.id);
            }
            if (!this.repo._dataProvider.isProxy) {
                if (this.info.entityInfo.deleted)
                    await this.info.entityInfo.deleted(this.instance, e);
            }
            if (this.repo.listeners)
                for (const listener of this.repo.listeners) {
                    await listener.deleted?.(this.instance);
                }
            this.repo._remult.liveQueryPublisher.itemChanged(this.repo.metadata.key, [
                { id: this.getId(), oldId: this.getOriginalId(), deleted: true },
            ]);
            this._wasDeleted = true;
        }
        catch (err) {
            throw await this.catchSaveErrors(err);
        }
    }
    async loadDataFrom(data, loadItems) {
        for (const col of this.info.fields) {
            let lu = this.lookups.get(col.key);
            if (lu) {
                lu.id = data[col.key];
                if (loadItems === undefined) {
                    if (!col.options.lazy && !getRelationFieldInfo(col))
                        await lu.waitLoad();
                }
                else {
                    if (loadItems.includes(col))
                        await lu.waitLoad();
                }
            }
            else if (!getRelationFieldInfo(col))
                if (data[col.key] === undefined)
                    delete this.instance[col.key];
                else
                    this.instance[col.key] = data[col.key];
        }
        await this.calcServerExpression();
        this.id = this.getId();
    }
    id;
    originalId;
    getOriginalId() {
        return this.originalId;
    }
    async calcServerExpression() {
        if (!this.repo._dataProvider.isProxy)
            //y2 should be changed to be based on data provider - consider naming
            for (const col of this.info.fieldsMetadata) {
                if (col.options.serverExpression) {
                    const result = (await col.options.serverExpression(this.instance));
                    if (result !== undefined)
                        this.instance[col.key] = result;
                }
            }
    }
    isNew() {
        this._subscribers?.reportObserved();
        return this._isNew;
    }
    wasChanged() {
        this._subscribers?.reportObserved();
        for (const col of this.fields) {
            const rel = getRelationFieldInfo(col.metadata);
            if (!rel || rel.type == 'reference')
                if (col.valueChanged())
                    return true;
        }
        return false;
    }
    async __performColumnAndEntityValidations() {
        for (const c of this.fieldsMetadata) {
            if (c.options.validate) {
                let col = new FieldRefImplementation(c.options, c, this.instance, this, this);
                await col.__performValidation();
            }
        }
        if (this.info.entityInfo.validation) {
            let e = this.buildLifeCycleEvent(() => { });
            await this.info.entityInfo.validation(this.instance, e);
        }
        if (this.repo.listeners)
            for (const listener of this.repo.listeners) {
                await listener.validating?.(this.instance);
            }
    }
}
const controllerColumns = Symbol.for('controllerColumns');
function prepareColumnInfo(r, remult) {
    return r.map((x) => decorateColumnSettings(x.settings(remult), remult));
}
function getControllerRef(container, remultArg) {
    const remultVar = remultArg || remult;
    //@ts-ignore
    let result = container[controllerColumns];
    //@ts-ignore
    if (!result)
        result = container[entityMember];
    if (!result) {
        let columnSettings = remultStatic.columnsOfType.get(container.constructor);
        if (!columnSettings)
            remultStatic.columnsOfType.set(container.constructor, (columnSettings = []));
        let base = Object.getPrototypeOf(container.constructor);
        while (base != null) {
            let baseCols = remultStatic.columnsOfType.get(base);
            if (baseCols) {
                columnSettings.unshift(...baseCols.filter((x) => !columnSettings.find((y) => y.key == x.key)));
            }
            base = Object.getPrototypeOf(base);
        }
        //@ts-ignore
        container[controllerColumns] = result = new controllerRefImpl(prepareColumnInfo(columnSettings, remultVar).map((x) => new columnDefsImpl(x, undefined, //TODO - not sure
        remultVar)), container, remultVar);
    }
    return result;
}
class controllerRefImpl extends rowHelperBase {
    constructor(columnsInfo, instance, remult) {
        super(columnsInfo, instance, remult, false);
        let _items = [];
        let r = {
            find: (c) => r[typeof c === 'string' ? c : c.key],
            [Symbol.iterator]: () => _items[Symbol.iterator](),
            toArray: () => _items,
        };
        for (const col of columnsInfo) {
            _items.push((r[col.key] = new FieldRefImplementation(col.options, col, instance, undefined, this)));
        }
        this.fields = r;
    }
    async __performColumnAndEntityValidations() {
        for (const col of this.fields) {
            if (col instanceof FieldRefImplementation) {
                await col.__performValidation();
            }
        }
    }
    fields;
}
class FieldRefImplementation {
    settings;
    metadata;
    container;
    helper;
    rowBase;
    constructor(settings, metadata, container, helper, rowBase) {
        this.settings = settings;
        this.metadata = metadata;
        this.container = container;
        this.helper = helper;
        this.rowBase = rowBase;
        this.target = this.settings.target;
        this.entityRef = this.helper; //todo - I'm not sure this is correct in the case of ControllerInstance
    }
    _subscribers;
    subscribe(listener) {
        if (!this._subscribers) {
            this.rowBase.initSubscribers();
        }
        return this._subscribers.subscribe(listener);
    }
    valueIsNull() {
        this.reportObserved();
        let lu = this.rowBase.lookups.get(this.metadata.key);
        if (lu) {
            return lu.id === undefined || lu.id === null;
        }
        return this.value === null;
    }
    originalValueIsNull() {
        this.reportObserved();
        this.rowBase.lookups.get(this.metadata.key);
        return this.rawOriginalValue() === null;
    }
    get key() {
        return this.metadata.key;
    }
    get repo() {
        return this.helper?.repository;
    }
    async load() {
        let lu = this.rowBase.lookups.get(this.metadata.key);
        let rel = getRelationFieldInfo(this.metadata);
        if (rel && this.helper) {
            if (rel.type === 'toMany') {
                return (this.container[this.metadata.key] = await this.repo.relations(this.container)[this.key].find());
            }
            else {
                let val = await this.repo
                    .relations(this.container)[this.metadata.key].findOne();
                if (val)
                    this.container[this.metadata.key] = val;
                else
                    return null; //TODO: check if this (!) is correct
            }
        }
        else if (lu) {
            if (this.valueChanged()) {
                await lu.waitLoadOf(this.rawOriginalValue());
            }
            return await lu.waitLoad();
        }
        return this.value;
    }
    target;
    reportObserved() {
        this._subscribers?.reportObserved();
        this.rowBase._subscribers?.reportObserved();
    }
    reportChanged() {
        this._subscribers?.reportChanged();
        this.rowBase._subscribers?.reportChanged();
    }
    get error() {
        this.reportObserved();
        if (!this.rowBase.errors)
            return undefined;
        return this.rowBase.errors[this.metadata.key];
    }
    set error(error) {
        if (!this.rowBase.errors)
            this.rowBase.errors = {};
        this.rowBase.errors[this.metadata.key] = error;
        this.reportChanged();
    }
    get displayValue() {
        this.reportObserved();
        if (this.value != undefined) {
            if (this.settings.displayValue)
                return this.settings.displayValue(this.container, this.value);
            else if (this.metadata.valueConverter.displayValue)
                return this.metadata.valueConverter.displayValue(this.value);
            else
                return this.value.toString();
        }
        return '';
    }
    get value() {
        return this.container[this.metadata.key];
    }
    set value(value) {
        this.container[this.metadata.key] = value;
    }
    get originalValue() {
        this.reportObserved();
        let lu = this.rowBase.lookups.get(this.metadata.key);
        if (lu)
            return lu.get(this.rawOriginalValue());
        return this.rowBase.originalValues[this.metadata.key];
    }
    rawOriginalValue() {
        return this.rowBase.originalValues[this.metadata.key];
    }
    setId(id) {
        this.value = id;
    }
    getId() {
        let lu = this.rowBase.lookups.get(this.metadata.key);
        if (lu)
            return lu.id != undefined ? lu.id : null;
        return this.value;
    }
    get inputValue() {
        this.reportObserved();
        let lu = this.rowBase.lookups.get(this.metadata.key);
        if (lu)
            return lu.id != undefined ? lu.id.toString() : null;
        return this.metadata.valueConverter.toInput(this.value, this.settings.inputType);
    }
    set inputValue(val) {
        let lu = this.rowBase.lookups.get(this.metadata.key);
        if (lu) {
            lu.setId(val);
        }
        else
            this.value = this.metadata.valueConverter.fromInput(val, this.settings.inputType);
    }
    valueChanged() {
        this.reportObserved();
        let val = this.value;
        let lu = this.rowBase.lookups.get(this.metadata.key);
        if (lu) {
            val = lu.id;
        }
        return (JSON.stringify(this.metadata.valueConverter.toJson(this.rowBase.originalValues[this.metadata.key])) != JSON.stringify(this.metadata.valueConverter.toJson(val)));
    }
    entityRef;
    async __performValidation() {
        try {
            const processValidation = (result) => {
                if (result !== true && result !== undefined && !this.error) {
                    if (typeof result === 'string' && result.length > 0)
                        this.error = result;
                    else
                        this.error = 'invalid value';
                }
            };
            if (this.settings.validate) {
                let self = this;
                let event = {
                    entityRef: this.entityRef,
                    get error() {
                        return self.error;
                    },
                    set error(value) {
                        self.error = value;
                    },
                    isNew: this.entityRef?.isNew() ?? false,
                    load: () => self.load(),
                    metadata: self.metadata,
                    originalValue: self.originalValue,
                    value: self.value,
                    valueChanged: () => self.valueChanged(),
                    originalValueIsNull: () => self.originalValueIsNull(),
                    valueIsNull: () => self.valueIsNull(),
                    isBackend: () => !self.rowBase?.remult?.dataProvider?.isProxy,
                };
                if (Array.isArray(this.settings.validate)) {
                    for (const v of this.settings.validate) {
                        processValidation(await v(this.container, event));
                    }
                }
                else if (typeof this.settings.validate === 'function')
                    processValidation(await this.settings.validate(this.container, event));
            }
        }
        catch (error) {
            if (typeof error === 'string')
                this.error = error;
            else
                this.error = error?.message;
        }
    }
    async validate() {
        await this.__performValidation();
        return !!!this.error;
    }
}
let tempLabelTransformer = {
    transformLabel: (remult, key, label, entityMetaData) => label,
    set transformCaption(val) {
        this.transformLabel = val;
    },
};
const fieldOptionsEnricher = remultStatic.fieldOptionsEnricher || {
    enrichFieldOptions: (options) => options,
};
const LabelTransformer = remultStatic.labelTransformer ||
    (remultStatic.labelTransformer = tempLabelTransformer);
function buildLabel(label, key, remult, metaData) {
    let result = undefined;
    if (typeof label === 'function') {
        if (remult)
            result = label(remult);
    }
    else if (label)
        result = label;
    result = LabelTransformer.transformLabel(remult, key, result ?? '', metaData);
    if (result)
        return result;
    if (key)
        return makeTitle(key);
    return '';
}
class columnDefsImpl {
    settings;
    entityDefs;
    remult;
    constructor(settings, entityDefs, remult) {
        this.settings = settings;
        this.entityDefs = entityDefs;
        this.remult = remult;
        this.options = this.settings;
        this.target = this.settings.target;
        this.valueConverter = new Proxy(this.settings.valueConverter ?? {}, {
            get: (target, prop) => {
                let result = target[prop];
                if (typeof result === 'function') {
                    return (...args) => {
                        try {
                            return target[prop](...args);
                        }
                        catch (err) {
                            const error = `${String(prop)} failed for value ${args?.[0]}. Error: ${typeof err === 'string' ? err : err.message}`;
                            throw new EntityError({
                                message: this.label + ': ' + error,
                                modelState: {
                                    [this.key]: error,
                                },
                            });
                        }
                    };
                }
                return result;
            },
        });
        this.allowNull = !!this.settings.allowNull;
        this.valueType = this.settings.valueType;
        this.key = this.settings.key;
        this.inputType = this.settings.inputType;
        if (settings.serverExpression)
            this.isServerExpression = true;
        if (typeof this.settings.allowApiUpdate === 'boolean')
            this.readonly = this.settings.allowApiUpdate;
        if (!this.inputType)
            this.inputType = this.valueConverter.inputType;
        this.dbName = settings.dbName;
        if (this.dbName == undefined)
            this.dbName = settings.key;
        this.label = buildLabel(settings.label ?? settings.caption, settings.key, remult, entityDefs);
    }
    apiUpdateAllowed(item) {
        if (this.options.allowApiUpdate === undefined)
            return true;
        return this.remult.isAllowedForInstance(item, this.options.allowApiUpdate);
    }
    displayValue(item) {
        return this.entityDefs
            .getEntityMetadataWithoutBreakingTheEntity(item)
            .fields.find(this.key)?.displayValue;
    }
    includedInApi(item) {
        if (this.options.includeInApi === undefined)
            return true;
        return this.remult.isAllowedForInstance(item, this.options.includeInApi);
    }
    toInput(value, inputType) {
        return this.valueConverter.toInput(value, inputType);
    }
    fromInput(inputValue, inputType) {
        return this.valueConverter.fromInput(inputValue, inputType);
    }
    async getDbName() {
        return fieldDbName(this, this.entityDefs);
    }
    options;
    target;
    readonly = false;
    valueConverter;
    allowNull;
    label;
    get caption() {
        return this.label;
    }
    dbName;
    inputType;
    key;
    get dbReadOnly() {
        return Boolean(this.settings.dbReadOnly);
    }
    isServerExpression = false;
    valueType;
}
class EntityFullInfo {
    entityInfo;
    remult;
    entityType;
    key;
    options;
    fieldsMetadata = [];
    constructor(columnsInfo, entityInfo, remult, entityType, key) {
        this.entityInfo = entityInfo;
        this.remult = remult;
        this.entityType = entityType;
        this.key = key;
        this.options = entityInfo;
        if (this.options.allowApiCrud !== undefined) {
            let crud;
            if (typeof this.options.allowApiCrud === 'function')
                crud = (_, remult) => this.options.allowApiCrud(remult);
            else
                crud = this.options.allowApiCrud;
            if (this.options.allowApiDelete === undefined)
                this.entityInfo.allowApiDelete = crud;
            if (this.options.allowApiInsert === undefined)
                this.entityInfo.allowApiInsert = crud;
            if (this.options.allowApiUpdate === undefined)
                this.entityInfo.allowApiUpdate = crud;
            if (this.options.allowApiRead === undefined)
                this.options.allowApiRead = this.options.allowApiCrud;
        }
        if (this.options.allowApiRead === undefined)
            this.options.allowApiRead = true;
        if (!this.key)
            this.key = entityType.name;
        if (!entityInfo.dbName)
            entityInfo.dbName = this.key;
        this.dbName = entityInfo.dbName;
        let r = {
            find: (c) => r[typeof c === 'string' ? c : c.key],
            [Symbol.iterator]: () => this.fieldsMetadata[Symbol.iterator](),
            toArray: () => this.fieldsMetadata,
        };
        for (const x of columnsInfo) {
            this.fieldsMetadata.push((r[x.key] = new columnDefsImpl(x, this, remult)));
        }
        this.fields = r;
        this.label = buildLabel(entityInfo.label ?? entityInfo.caption, this.key, remult, this);
        if (entityInfo.id) {
            let r = typeof entityInfo.id === 'string'
                ? this.fields.find(entityInfo.id)
                : Array.isArray(entityInfo.id)
                    ? entityInfo.id.map((x) => this.fields.find(x))
                    : typeof entityInfo.id === 'function'
                        ? entityInfo.id(this.fields)
                        : Object.keys(entityInfo.id).map((x) => this.fields.find(x));
            if (Array.isArray(r)) {
                if (r.length > 1)
                    this.idMetadata.field = new CompoundIdField(...r);
                else if (r.length == 1)
                    this.idMetadata.field = r[0];
            }
            else
                this.idMetadata.field = r;
        }
        if (!this.idMetadata.field) {
            const idField = this.fields['id'];
            if (idField)
                this.idMetadata.field = idField;
            else
                this.idMetadata.field = [...this.fields][0];
        }
    }
    apiUpdateAllowed(item) {
        if (this.options.allowApiUpdate === undefined)
            return false;
        return !item
            ? this.remult.isAllowedForInstance(undefined, this.options.allowApiUpdate)
            : this.getEntityMetadataWithoutBreakingTheEntity(item).apiUpdateAllowed;
    }
    get apiReadAllowed() {
        if (this.options.allowApiRead === undefined)
            return true;
        return this.remult.isAllowed(this.options.allowApiRead);
    }
    apiDeleteAllowed(item) {
        if (this.options.allowApiDelete === undefined)
            return false;
        return !item
            ? this.remult.isAllowedForInstance(undefined, this.options.allowApiDelete)
            : this.getEntityMetadataWithoutBreakingTheEntity(item).apiDeleteAllowed;
    }
    apiInsertAllowed(item) {
        if (this.options.allowApiUpdate === undefined)
            return false;
        return !item
            ? this.remult.isAllowedForInstance(undefined, this.options.allowApiInsert)
            : this.getEntityMetadataWithoutBreakingTheEntity(item).apiInsertAllowed;
    }
    getEntityMetadataWithoutBreakingTheEntity(item) {
        let result = getEntityRef(item, false);
        if (result)
            return result;
        return this.remult.repo(this.entityType).getEntityRef({ ...item });
    }
    getDbName() {
        return entityDbName(this);
    }
    idMetadata = {
        getId: (item) => {
            if (item === undefined || item === null)
                return item;
            const ref = getEntityRef(item, false);
            if (ref)
                return ref.getId();
            if (this.idMetadata.field instanceof CompoundIdField)
                return this.idMetadata.field.getId(item);
            else
                return item[this.idMetadata.field.key];
        },
        field: undefined,
        get fields() {
            return this.field instanceof CompoundIdField
                ? this.field.fields
                : [this.field];
        },
        createIdInFilter: (items) => {
            if (items.length > 0)
                return {
                    $or: items.map((x) => this.idMetadata.getIdFilter(getEntityRef(x).getId())),
                };
            else
                return {
                    [this.fields.toArray()[0].key]: [],
                };
        },
        isIdField: (col) => {
            return col.key == this.idMetadata.field.key;
        },
        getIdFilter: (...ids) => {
            if (this.idMetadata.field instanceof CompoundIdField) {
                let field = this.idMetadata.field;
                if (ids.length == 1) {
                    return field.isEqualTo(ids[0]);
                }
                else
                    return {
                        $or: ids.map((x) => field.isEqualTo(x)),
                    };
            }
            if (ids.length == 1)
                return {
                    [this.idMetadata.field.key]: ids[0],
                };
            else
                return {
                    [this.idMetadata.field.key]: ids,
                };
        },
    };
    fields;
    dbName;
    label;
    get caption() {
        return this.label;
    }
}
function isAutoIncrement(f) {
    return f.options?.valueConverter?.fieldTypeInDb === 'autoincrement';
}
class ValueListInfo {
    valueListType;
    static get(type) {
        let r = typeCache.get(type);
        if (!r) {
            r = new ValueListInfo(type);
            typeCache.set(type, r);
        }
        return r;
    }
    byIdMap = new Map();
    values = [];
    isNumeric = false;
    constructor(valueListType) {
        this.valueListType = valueListType;
        for (let member in this.valueListType) {
            let s = this.valueListType[member];
            if (s instanceof this.valueListType) {
                if (s.id === undefined)
                    s.id = member;
                if (typeof s.id === 'number')
                    this.isNumeric = true;
                setLabelAndCaption(s, member);
                this.byIdMap.set(s.id, s);
                this.values.push(s);
            }
        }
        if (this.isNumeric) {
            this.fieldTypeInDb = 'integer';
        }
        var options = this.valueListType[storableMember];
        if (options) {
            for (const op of options) {
                if (op?.getValues) {
                    this.values.splice(0, this.values.length, ...op.getValues());
                    this.byIdMap.clear();
                    this.values.forEach((s) => {
                        setLabelAndCaption(s, '');
                        this.byIdMap.set(s.id, s);
                    });
                }
            }
            if (this.values.find((s) => s.id === undefined))
                throw new Error(`ValueType ${this.valueListType} has values without an id`);
        }
        else
            throw new Error(`ValueType not yet initialized, did you forget to call @ValueListFieldType on ` +
                valueListType);
    }
    getValues() {
        return this.values;
    }
    byId(key) {
        if (this.isNumeric)
            key = +key;
        return this.byIdMap.get(key);
    }
    fromJson(val) {
        return this.byId(val);
    }
    toJson(val) {
        if (!val)
            return undefined;
        return val.id;
    }
    fromDb(val) {
        return this.fromJson(val);
    }
    toDb(val) {
        return this.toJson(val);
    }
    toInput(val, inputType) {
        return this.toJson(val);
    }
    fromInput(val, inputType) {
        return this.fromJson(val);
    }
    displayValue(val) {
        if (!val)
            return '';
        return val.caption;
    }
    fieldTypeInDb;
    inputType;
}
const typeCache = new Map();
function setLabelAndCaption(s, member) {
    let label = s.label ?? s.caption;
    if (label === undefined)
        label = makeTitle(s.id !== undefined ? s.id.toString() : member);
    if (s.label === undefined)
        s.label = label;
    if (s.caption === undefined)
        s.caption = label;
}
function getValueList(type) {
    let meta = type?.metadata;
    if (!meta && isOfType(type, 'options'))
        meta = type;
    type = meta?.valueType || type;
    if (type) {
        var options = type[storableMember];
        if (options)
            return ValueListInfo.get(type).getValues();
    }
    let optionalValues = (meta?.options)[fieldOptionalValuesFunctionKey];
    if (optionalValues)
        return optionalValues();
    return undefined;
}
const storableMember = Symbol.for('storableMember');
const fieldOptionalValuesFunctionKey = Symbol.for('fieldOptionalValues');
function buildOptions(options, remult) {
    let r = {};
    for (const o of options) {
        if (o) {
            if (typeof o === 'function')
                o(r, remult);
            else {
                const { validate, ...otherOptions } = o;
                r.validate = addValidator(r.validate, validate);
                Object.assign(r, otherOptions);
            }
        }
    }
    fieldOptionsEnricher.enrichFieldOptions?.(r);
    return r;
}
function decorateColumnSettings(settings, remult) {
    if (settings.valueType) {
        let settingsOnTypeLevel = settings.valueType[storableMember];
        if (settingsOnTypeLevel) {
            settings = buildOptions([...settingsOnTypeLevel, settings], remult);
        }
    }
    if (settings.valueType == String) {
        let x = settings;
        if (!settings.valueConverter)
            x.valueConverter = ValueConverters.String;
    }
    if (settings.valueType == Number) {
        let x = settings;
        if (!settings.valueConverter)
            x.valueConverter = ValueConverters.Number;
    }
    if (settings.valueType == Date) {
        let x = settings;
        if (!settings.valueConverter) {
            x.valueConverter = ValueConverters.Date;
        }
    }
    if (settings.valueType == Boolean) {
        let x = settings;
        if (!x.valueConverter)
            x.valueConverter = ValueConverters.Boolean;
    }
    if (!settings.valueConverter) {
        let ei = getEntitySettings(settings.valueType, false);
        if (ei) {
            let isIdNumeric = undefined;
            settings.valueConverter = {
                toDb: (x) => x,
                fromDb: (x) => x,
            };
            settings.valueConverter = new Proxy(settings.valueConverter, {
                get(target, property) {
                    if (target[property] === undefined) {
                        if (isIdNumeric === undefined) {
                            if (property === 'inputType')
                                return '';
                            isIdNumeric =
                                remult.repo(settings.valueType).metadata.idMetadata.field
                                    .valueType === Number;
                            for (const key of [
                                'fieldTypeInDb',
                                'toJson',
                                'fromJson',
                                'toDb',
                                'fromDb',
                            ]) {
                                //@ts-ignore
                                target[key] = isIdNumeric
                                    ? ValueConverters.Integer[key]
                                    : ValueConverters.String[key];
                            }
                        }
                    }
                    return target[property];
                },
                set(target, property, value, receiver) {
                    target[property] = value;
                    return true;
                },
            });
        }
        else
            settings.valueConverter = ValueConverters.Default;
        return settings;
    }
    if (!settings.valueConverter.toJson) {
        settings.valueConverter.toJson = (x) => x;
    }
    if (!settings.valueConverter.fromJson) {
        settings.valueConverter.fromJson = (x) => x;
    }
    const fromJson = settings.valueConverter.fromJson;
    const toJson = settings.valueConverter.toJson;
    if (!settings.valueConverter.toDb) {
        settings.valueConverter.toDb = (x) => toJson(x);
    }
    if (!settings.valueConverter.fromDb) {
        settings.valueConverter.fromDb = (x) => fromJson(x);
    }
    if (!settings.valueConverter.toInput) {
        settings.valueConverter.toInput = (x) => toJson(x);
    }
    if (!settings.valueConverter.fromInput) {
        settings.valueConverter.fromInput = (x) => fromJson(x);
    }
    return settings;
}
class EntityBase {
    get _() {
        return getEntityRef(this);
    }
    save(options) {
        return getEntityRef(this).save(options);
    }
    assign(values) {
        assign(this, values);
        return this;
    }
    delete() {
        return this._.delete();
    }
    isNew() {
        return this._.isNew();
    }
    get $() {
        return this._.fields;
    }
}
function getEntityMetadata(entity) {
    if (entity.metadata)
        return entity.metadata;
    const settings = getEntitySettings(entity, false);
    if (settings) {
        return remult.repo(entity).metadata;
    }
    return entity;
}
function getRepository(entity) {
    const settings = getEntitySettings(entity, false);
    if (settings) {
        return remult.repo(entity);
    }
    return entity;
}
async function promiseAll(array, mapToPromise) {
    const result = [];
    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        result.push(await mapToPromise(element, index));
    }
    return result;
}

const validateNumber = createValueValidator((x) => {
    return !isNaN(x) && isFinite(x);
});
class Fields {
    /**
     * Stored as a JSON.stringify - to store as json use Fields.json
     */
    static object(...options) {
        return Field(undefined, ...options);
    }
    static json(...options) {
        let op = options;
        if (op.valueConverter && !op.valueConverter.fieldTypeInDb)
            //@ts-ignore
            op.valueConverter.fieldTypeInDb = 'json';
        if (op.valueType && !op.valueType.inputType)
            //@ts-ignore
            op.valueType.inputType = InputTypes.json;
        return Field(undefined, {
            valueConverter: {
                fieldTypeInDb: 'json',
                inputType: InputTypes.json,
            },
        }, ...options);
    }
    static dateOnly(...options) {
        return Field(() => Date, {
            valueConverter: ValueConverters.DateOnly,
        }, ...options);
    }
    static date(...options) {
        return Field(() => Date, ...options);
    }
    static integer(...options) {
        return Field(() => Number, {
            valueConverter: ValueConverters.Integer,
            validate: validateNumber,
        }, ...options);
    }
    static autoIncrement(...options) {
        return Field(() => Number, {
            allowApiUpdate: false,
            dbReadOnly: true,
            valueConverter: {
                ...ValueConverters.Integer,
                fieldTypeInDb: 'autoincrement',
            },
        }, ...options);
    }
    static number(...options) {
        return Field(() => Number, {
            validate: validateNumber,
        }, ...options);
    }
    static createdAt(...options) {
        return Field(() => Date, {
            allowApiUpdate: false,
            saving: (_, ref, { isNew }) => {
                if (isNew)
                    ref.value = new Date();
            },
        }, ...options);
    }
    static updatedAt(...options) {
        return Field(() => Date, {
            allowApiUpdate: false,
            saving: (_, ref) => {
                ref.value = new Date();
            },
        }, ...options);
    }
    /** @deprecated use `@Fields.id()` instead */
    static uuid(...options) {
        return Fields.id({
            idFactory: () => crypto.randomUUID(),
            ...options,
        });
    }
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
    static get defaultIdFactory() {
        return (remultStatic.defaultIdFactory ??
            (remultStatic.defaultIdFactory = () => crypto.randomUUID()));
    }
    static set defaultIdFactory(value) {
        remultStatic.defaultIdFactory = value;
    }
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
    static id(options) {
        return Field(() => String, {
            allowApiUpdate: false,
            defaultValue: () => {
                let idFactory = options?.idFactory ?? Fields.defaultIdFactory;
                return idFactory();
            },
            saving: (_, r) => {
                if (!r.value) {
                    let idFactory = options?.idFactory ?? Fields.defaultIdFactory;
                    r.value = idFactory();
                }
            },
            ...options,
        });
    }
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
    static literal(optionalValues, ...options) {
        return Fields.string({
            validate: (entity, event) => Validators.in(optionalValues())(entity, event),
            //@ts-expect-error as we are adding this to options without it being defined in options
            [fieldOptionalValuesFunctionKey]: optionalValues,
        }, ...options);
    }
    static enum(enumType, ...options) {
        let valueConverter;
        return Field(
        //@ts-ignore
        () => enumType(), {
            validate: (entity, event) => Validators.enum(enumType())(entity, event),
            [fieldOptionalValuesFunctionKey]: () => getEnumValues(enumType()),
        }, ...options, (options) => {
            options[fieldOptionalValuesFunctionKey] = () => getEnumValues(enumType());
            if (valueConverter === undefined) {
                let enumObj = enumType();
                let enumValues = getEnumValues(enumObj);
                valueConverter = enumValues.find((x) => typeof x === 'string')
                    ? ValueConverters.String
                    : ValueConverters.Integer;
            }
            if (!options.valueConverter) {
                options.valueConverter = valueConverter;
            }
            else if (!options.valueConverter.fieldTypeInDb) {
                //@ts-ignore
                options.valueConverter.fieldTypeInDb = valueConverter.fieldTypeInDb;
            }
        });
    }
    static string(...options) {
        return Field(() => String, ...options);
    }
    static boolean(...options) {
        return Field(() => Boolean, ...options);
    }
}
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
function Field(valueType, ...options) {
    // import ANT!!!! if you call this in another decorator, make sure to set It's return type correctly with the | undefined
    return (target, context, c) => {
        const key = typeof context === 'string' ? context : context.name.toString();
        let factory = (remult) => {
            let r = buildOptions(options, remult);
            if (r.required) {
                r.validate = addValidator(r.validate, Validators.required, true);
            }
            if (isOfType(r, 'maxLength')) {
                let z = r;
                if (z.maxLength) {
                    z.validate = addValidator(z.validate, Validators.maxLength(z.maxLength));
                }
            }
            if (isOfType(r, 'minLength')) {
                let z = r;
                if (z.minLength) {
                    z.validate = addValidator(z.validate, Validators.minLength(z.minLength));
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
            let type = r.valueType;
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
        let names = remultStatic.columnsOfType.get(target.constructor);
        if (!names) {
            names = [];
            remultStatic.columnsOfType.set(target.constructor, names);
        }
        let set = names.find((x) => x.key == key);
        if (!set)
            names.push({
                key,
                settings: factory,
            });
        else {
            let prev = set.settings;
            set.settings = (c) => {
                let prevO = prev(c);
                let curr = factory(c);
                return Object.assign(prevO, curr);
            };
        }
    };
}
function checkTarget(target) {
    if (!target)
        throw new Error("Set the 'experimentalDecorators:true' option in your 'tsconfig' or 'jsconfig' (target undefined)");
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

class IdEntity extends EntityBase {
    id;
}
__decorate([
    Fields.id(),
    __metadata("design:type", String)
], IdEntity.prototype, "id", void 0);

export { getEntityRef as $, entityInfo as A, entityInfo_key as B, ConnectionNotFoundError as C, getEntitySettings as D, EntityError as E, Filter as F, GroupByCountMember as G, customDatabaseFilterToken as H, InputTypes as I, GroupByOperators as J, compareForSort as K, CompoundIdField as L, getRepository as M, getRepositoryInternals as N, originalSqlExpressionKey as O, getEntityMetadata as P, entityDbName as Q, RemultAsyncLocalStorage as R, Sort as S, fieldDbName as T, buildRestDataProvider as U, ValueConverters as V, checkTarget as W, ClassHelper as X, isBackend as Y, decorateColumnSettings as Z, __decorate as _, GroupByForApiKey as a, getControllerRef as a0, findOptionsToJson as b, buildFilterFromRequestParameters as c, doTransaction as d, customUrlToken as e, findOptionsFromJson as f, getRelationFieldInfo as g, getValueList as h, initDataProvider as i, remultStatic as j, Remult as k, liveQueryAction as l, getEntityKey as m, streamUrl as n, liveQueryKeepAliveRoute as o, isOfType as p, Fields as q, remult as r, serverActionField as s, __metadata as t, IdEntity as u, EntityBase as v, withRemult as w, cast as x, isAutoIncrement as y, setControllerSettings as z };
//# sourceMappingURL=IdEntity-Le34BexZ.js.map
