import { Sort } from './sort.js';
export function extractSort(sort) {
    if (sort instanceof Array) {
        let r = new Sort();
        sort.forEach((i) => {
            r.Segments.push(i);
        });
        return r;
    }
    return sort;
}
export class EntityError extends Error {
    constructor(errorInfo) {
        super(errorInfo.message);
        Object.assign(this, errorInfo);
    }
    modelState;
    stack;
    exception;
    httpStatusCode;
}
export class DataProviderPromiseWrapper {
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
