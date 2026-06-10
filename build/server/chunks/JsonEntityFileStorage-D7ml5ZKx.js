import * as fs from 'fs';
import * as path from 'path';
import { H as customDatabaseFilterToken, S as Sort, J as GroupByOperators, K as compareForSort, F as Filter, L as CompoundIdField, G as GroupByCountMember } from './IdEntity-Le34BexZ.js';
import { d as dbNamesOf, i as isDbReadonly } from './agent-service-ZiiPDM6E.js';
import './chat-message-CwAUUCQ1.js';
import './chat-session-settings-C_T3OJ8l.js';
import '@earendil-works/pi-ai';

class ArrayEntityDataProvider {
    entity;
    rows;
    static rawFilter(filter) {
        return {
            [customDatabaseFilterToken]: {
                arrayFilter: filter,
            },
        };
    }
    constructor(entity, rows) {
        this.entity = entity;
        this.rows = rows;
    }
    async groupBy(options) {
        const sort = new Sort();
        if (options?.group)
            for (const field of options?.group) {
                sort.Segments.push({ field: field });
            }
        const rows = await this.find({ orderBy: sort, where: options?.where });
        let result = [];
        let group = {};
        let first = true;
        let count = 0;
        let aggregates = [];
        const operatorImpl = {
            sum: (key) => {
                let sum = 0;
                return {
                    process(row) {
                        const val = row[key];
                        if (val !== undefined && val !== null)
                            sum += row[key];
                    },
                    finishGroup(result) {
                        result[key] = { ...result[key], sum };
                        sum = 0;
                    },
                };
            },
            avg: (key) => {
                let sum = 0;
                let count = 0;
                return {
                    process(row) {
                        const val = row[key];
                        if (val !== undefined && val !== null) {
                            sum += row[key];
                            count++;
                        }
                    },
                    finishGroup(result) {
                        result[key] = {
                            ...result[key],
                            avg: sum / count,
                        };
                        sum = 0;
                        count = 0;
                    },
                };
            },
            min: (key) => {
                let min = undefined;
                return {
                    process(row) {
                        const val = row[key];
                        if (val !== undefined && val !== null) {
                            if (min === undefined || val < min)
                                min = val;
                        }
                    },
                    finishGroup(result) {
                        result[key] = { ...result[key], min };
                        min = undefined;
                    },
                };
            },
            max: (key) => {
                let max = undefined;
                return {
                    process(row) {
                        const val = row[key];
                        if (val !== undefined && val !== null) {
                            if (max === undefined || val > max)
                                max = val;
                        }
                    },
                    finishGroup(result) {
                        result[key] = { ...result[key], max };
                        max = undefined;
                    },
                };
            },
            distinctCount: (key) => {
                let distinct = new Set();
                return {
                    process(row) {
                        const val = row[key];
                        if (val !== undefined && val !== null)
                            distinct.add(val);
                    },
                    finishGroup(result) {
                        result[key] = { ...result[key], distinctCount: distinct.size };
                        distinct.clear();
                    },
                };
            },
        };
        for (let operator of GroupByOperators) {
            if (options?.[operator]) {
                for (const element of options[operator]) {
                    aggregates.push(operatorImpl[operator](element.key));
                }
            }
        }
        function finishGroup() {
            const r = { ...group, $count: count };
            for (const a of aggregates) {
                a.finishGroup(r);
            }
            r[GroupByCountMember] = count;
            result.push(r);
            first = true;
            count = 0;
        }
        for (const row of rows) {
            if (options?.group) {
                if (!first) {
                    for (const field of options?.group) {
                        if (group[field.key] != row[field.key]) {
                            finishGroup();
                            break;
                        }
                    }
                }
                if (first) {
                    for (const field of options?.group) {
                        group[field.key] = row[field.key];
                    }
                }
            }
            for (const a of aggregates) {
                a.process(row);
            }
            count++;
            first = false;
        }
        finishGroup();
        if (options?.orderBy) {
            result.sort((a, b) => {
                for (const x of options.orderBy) {
                    const getValue = (row) => {
                        if (!x.field && x.operation == 'count') {
                            return row[GroupByCountMember];
                        }
                        else {
                            switch (x.operation) {
                                case 'count':
                                    return row[GroupByCountMember];
                                case undefined:
                                    return row[x.field.key];
                                default:
                                    return row[x.field.key][x.operation];
                            }
                        }
                    };
                    let compare = compareForSort(getValue(a), getValue(b), x.isDescending);
                    if (compare != 0)
                        return compare;
                }
                return 0;
            });
        }
        return pageArray(result, { page: options?.page, limit: options?.limit });
    }
    //@internal
    __names;
    //@internal
    async init() {
        if (this.__names)
            return this.__names;
        this.__names = await dbNamesOf(this.entity, (x) => x);
        for (const r of this.rows()) {
            this.verifyThatRowHasAllNotNullColumns(r, this.__names);
        }
        return this.__names;
    }
    //@internal
    verifyThatRowHasAllNotNullColumns(r, names) {
        for (const f of this.entity.fields) {
            const key = names.$dbNameOf(f);
            if (!f.isServerExpression)
                if (!f.allowNull) {
                    if (r[key] === undefined || r[key] === null) {
                        let val = undefined;
                        if (f.valueType === Boolean)
                            val = false;
                        else if (f.valueType === Number)
                            val = 0;
                        else if (f.valueType === String)
                            val = '';
                        r[key] = val;
                    }
                }
                else if (r[key] === undefined)
                    r[key] = null;
        }
    }
    async count(where) {
        let rows = this.rows();
        const names = await this.init();
        let j = 0;
        for (let i = 0; i < rows.length; i++) {
            if (!where) {
                j++;
            }
            else {
                let x = new FilterConsumerBridgeToObject(rows[i], names);
                where.__applyToConsumer(x);
                if (x.ok)
                    j++;
            }
        }
        return j;
    }
    async find(options) {
        let rows = this.rows();
        const dbNames = await this.init();
        if (options) {
            if (options.where) {
                rows = rows.filter((i) => {
                    let x = new FilterConsumerBridgeToObject(i, dbNames);
                    options.where.__applyToConsumer(x);
                    return x.ok;
                });
            }
            if (options.orderBy) {
                rows = rows.sort((a, b) => {
                    return options.orderBy.compare(a, b, dbNames.$dbNameOf);
                });
            }
            rows = pageArray(rows, options);
        }
        if (rows)
            return rows.map((i) => {
                return this.translateFromJson(i, dbNames, options?.select);
            });
        return [];
    }
    //@internal
    translateFromJson(row, dbNames, select) {
        let result = {};
        for (const col of this.entity.fields) {
            if (select && !select.includes(col.key))
                continue;
            result[col.key] = col.valueConverter.fromJson(row[dbNames.$dbNameOf(col)]);
        }
        return result;
    }
    //@internal
    translateToJson(row, dbNames) {
        let result = {};
        for (const col of this.entity.fields) {
            if (!isDbReadonly(col, dbNames))
                result[dbNames.$dbNameOf(col)] = col.valueConverter.toJson(row[col.key]);
        }
        return result;
    }
    //@internal
    idMatches(id, names) {
        return (item) => {
            let x = new FilterConsumerBridgeToObject(item, names);
            Filter.fromEntityFilter(this.entity, this.entity.idMetadata.getIdFilter(id)).__applyToConsumer(x);
            return x.ok;
        };
    }
    async update(id, data) {
        const names = await this.init();
        let idMatches = this.idMatches(id, names);
        let keys = Object.keys(data);
        for (let i = 0; i < this.rows().length; i++) {
            let r = this.rows()[i];
            if (idMatches(r)) {
                let newR = { ...r };
                for (const f of this.entity.fields) {
                    if (!isDbReadonly(f, names)) {
                        if (keys.includes(f.key)) {
                            newR[names.$dbNameOf(f)] = f.valueConverter.toJson(data[f.key]);
                        }
                    }
                }
                if (this.entity.idMetadata.fields.find((x) => newR[names.$dbNameOf(x)] != r[names.$dbNameOf(x)]) &&
                    this.rows().find((x) => {
                        for (const f of this.entity.idMetadata.fields) {
                            if (x[names.$dbNameOf(f)] != newR[names.$dbNameOf(f)])
                                return false;
                        }
                        return true;
                    })) {
                    throw Error('id already exists');
                }
                this.verifyThatRowHasAllNotNullColumns(newR, names);
                this.rows()[i] = newR;
                return Promise.resolve(this.translateFromJson(this.rows()[i], names));
            }
        }
        throw new Error(`ArrayEntityDataProvider: Couldn't find row with id "${id}" in entity "${this.entity.key}" to update`);
    }
    async delete(id) {
        const names = await this.init();
        let idMatches = this.idMatches(id, names);
        for (let i = 0; i < this.rows().length; i++) {
            if (idMatches(this.rows()[i])) {
                this.rows().splice(i, 1);
                return Promise.resolve();
            }
        }
        throw new Error(`ArrayEntityDataProvider: Couldn't find row with id "${id}" in entity "${this.entity.key}" to delete`);
    }
    async insert(data) {
        const names = await this.init();
        let j = this.translateToJson(data, names);
        let idf = this.entity.idMetadata.field;
        if (!(idf instanceof CompoundIdField) &&
            idf.valueConverter.fieldTypeInDb === 'autoincrement') {
            const idDbName = names.$dbNameOf(idf);
            j[idDbName] = 1;
            for (const row of this.rows()) {
                if (row[idDbName] >= j[idDbName])
                    j[idDbName] = row[idDbName] + 1;
            }
        }
        else {
            if (this.rows().find((x) => {
                for (const f of this.entity.idMetadata.fields) {
                    if (x[names.$dbNameOf(f)] != j[names.$dbNameOf(f)])
                        return false;
                }
                return true;
            })) {
                throw Error('id already exists');
            }
        }
        this.verifyThatRowHasAllNotNullColumns(j, names);
        this.rows().push(j);
        return Promise.resolve(this.translateFromJson(j, names));
    }
}
function pageArray(rows, options) {
    if (!options)
        return rows;
    if (!options.limit)
        return rows;
    let page = 1;
    if (options.page)
        page = options.page;
    if (page < 1)
        page = 1;
    let x = 0;
    return rows.filter((i) => {
        x++;
        let max = page * options.limit;
        let min = max - options.limit;
        return x > min && x <= max;
    });
}
class FilterConsumerBridgeToObject {
    row;
    dbNames;
    ok = true;
    constructor(row, dbNames) {
        this.row = row;
        this.dbNames = dbNames;
    }
    databaseCustom(databaseCustom) {
        if (databaseCustom && databaseCustom.arrayFilter) {
            if (!databaseCustom.arrayFilter(this.row))
                this.ok = false;
        }
    }
    custom(key, customItem) {
        throw new Error('Custom Filter should be translated before it gets here');
    }
    or(orElements) {
        for (const element of orElements) {
            let filter = new FilterConsumerBridgeToObject(this.row, this.dbNames);
            element.__applyToConsumer(filter);
            if (filter.ok) {
                return;
            }
        }
        this.ok = false;
    }
    not(element) {
        let filter = new FilterConsumerBridgeToObject(this.row, this.dbNames);
        element.__applyToConsumer(filter);
        if (filter.ok)
            this.ok = false;
    }
    isNull(col) {
        if (this.row[this.dbNames.$dbNameOf(col)] != null)
            this.ok = false;
    }
    isNotNull(col) {
        if (this.row[this.dbNames.$dbNameOf(col)] == null)
            this.ok = false;
    }
    isIn(col, val) {
        for (const v of val) {
            if (this.row[this.dbNames.$dbNameOf(col)] == col.valueConverter.toJson(v)) {
                return;
            }
        }
        this.ok = false;
    }
    isEqualTo(col, val) {
        if (this.row[this.dbNames.$dbNameOf(col)] != col.valueConverter.toJson(val))
            this.ok = false;
    }
    isDifferentFrom(col, val) {
        if (this.row[this.dbNames.$dbNameOf(col)] == col.valueConverter.toJson(val))
            this.ok = false;
    }
    isGreaterOrEqualTo(col, val) {
        if (this.row[this.dbNames.$dbNameOf(col)] < col.valueConverter.toJson(val))
            this.ok = false;
    }
    isGreaterThan(col, val) {
        if (this.row[this.dbNames.$dbNameOf(col)] <= col.valueConverter.toJson(val))
            this.ok = false;
    }
    isLessOrEqualTo(col, val) {
        if (this.row[this.dbNames.$dbNameOf(col)] > col.valueConverter.toJson(val))
            this.ok = false;
    }
    isLessThan(col, val) {
        if (this.row[this.dbNames.$dbNameOf(col)] >= col.valueConverter.toJson(val))
            this.ok = false;
    }
    containsCaseInsensitive(col, val) {
        let v = this.row[this.dbNames.$dbNameOf(col)];
        if (!v) {
            this.ok = false;
            return;
        }
        let s = '' + v;
        if (val)
            val = col.valueConverter.toJson(val);
        if (val)
            val = val.toString().toLowerCase();
        if (s.toLowerCase().indexOf(val) < 0)
            this.ok = false;
    }
    notContainsCaseInsensitive(col, val) {
        let v = this.row[this.dbNames.$dbNameOf(col)];
        if (!v) {
            this.ok = false;
            return;
        }
        let s = '' + v;
        if (val)
            val = col.valueConverter.toJson(val);
        if (val)
            val = val.toString().toLowerCase();
        if (s.toLowerCase().indexOf(val) >= 0)
            this.ok = false;
    }
    startsWithCaseInsensitive(col, val) {
        let v = this.row[this.dbNames.$dbNameOf(col)];
        if (!v) {
            this.ok = false;
            return;
        }
        let s = '' + v;
        if (val)
            val = col.valueConverter.toJson(val);
        if (val)
            val = val.toString().toLowerCase();
        if (!s.toLowerCase().startsWith(val))
            this.ok = false;
    }
    endsWithCaseInsensitive(col, val) {
        let v = this.row[this.dbNames.$dbNameOf(col)];
        if (!v) {
            this.ok = false;
            return;
        }
        let s = '' + v;
        if (val)
            val = col.valueConverter.toJson(val);
        if (val)
            val = val.toString().toLowerCase();
        if (!s.toLowerCase().endsWith(val))
            this.ok = false;
    }
}

class JsonDataProvider {
    storage;
    formatted;
    constructor(storage, formatted = false) {
        this.storage = storage;
        this.formatted = formatted;
    }
    getEntityDataProvider(entity) {
        return new JsonEntityDataProvider(entity, this.storage, this.formatted);
    }
    async transaction(action) {
        await action(this);
    }
}
class JsonEntityDataProvider {
    entity;
    helper;
    formatted;
    constructor(entity, helper, formatted) {
        this.entity = entity;
        this.helper = helper;
        this.formatted = formatted;
    }
    groupBy(options) {
        return (this.p = this.p.then(() => this.loadEntityData((dp, save) => dp.groupBy(options))));
    }
    async loadEntityData(what) {
        let data = [];
        let dbName = await this.entity.dbName;
        let s = await this.helper.getItem(dbName);
        if (s)
            data = this.helper.supportsRawJson ? s : JSON.parse(s);
        let dp = new ArrayEntityDataProvider(this.entity, () => data);
        return what(dp, async () => await this.helper.setItem(dbName, this.helper.supportsRawJson
            ? data
            : JSON.stringify(data, undefined, this.formatted ? 2 : undefined)));
    }
    p = Promise.resolve();
    find(options) {
        return (this.p = this.p.then(() => this.loadEntityData((dp, save) => dp.find(options))));
    }
    count(where) {
        return (this.p = this.p.then(() => this.loadEntityData((dp, save) => dp.count(where))));
    }
    update(id, data) {
        return (this.p = this.p.then(() => this.loadEntityData((dp, save) => dp.update(id, data).then(async (x) => {
            await save();
            return x;
        }))));
    }
    delete(id) {
        return (this.p = this.p.then(() => this.loadEntityData((dp, save) => dp.delete(id).then(async (x) => {
            await save();
            return x;
        }))));
    }
    async insert(data) {
        return (this.p = this.p.then(() => this.loadEntityData((dp, save) => dp.insert(data).then(async (x) => {
            await save();
            return x;
        }))));
    }
}

class JsonEntityFileStorage {
    folderPath;
    getItem(entityDbName) {
        let fn = path.join(this.folderPath, entityDbName) + '.json';
        if (fs.existsSync(fn)) {
            return fs.readFileSync(fn).toString();
        }
        return null;
    }
    setItem(entityDbName, json) {
        if (!fs.existsSync(this.folderPath)) {
            fs.mkdirSync(this.folderPath);
        }
        return fs.writeFileSync(path.join(this.folderPath, entityDbName) + '.json', json);
    }
    constructor(folderPath) {
        this.folderPath = folderPath;
    }
}
class JsonFileDataProvider extends JsonDataProvider {
    constructor(folderPath) {
        super(new JsonEntityFileStorage(folderPath), true);
    }
}

export { JsonEntityFileStorage, JsonFileDataProvider };
//# sourceMappingURL=JsonEntityFileStorage-D7ml5ZKx.js.map
