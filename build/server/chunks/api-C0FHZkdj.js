import { E as Entity, C as ChatMessage } from './chat-message-CwAUUCQ1.js';
import { A as ActiveStream, P as ProviderSetting, C as ChatSessionSettings } from './chat-session-settings-C_T3OJ8l.js';
import { F as ForbiddenError, c as classBackendMethodsArray, a as Action, d as dbNamesOf, s as shouldNotCreateField, S as SqlDatabase, A as AgentService } from './agent-service-ZiiPDM6E.js';
import { f as findOptionsFromJson, C as ConnectionNotFoundError, l as liveQueryAction, d as doTransaction, F as Filter, G as GroupByCountMember, a as GroupByForApiKey, g as getRelationFieldInfo, b as findOptionsToJson, c as buildFilterFromRequestParameters, E as EntityError, e as customUrlToken, I as InputTypes, h as getValueList, i as initDataProvider, j as remultStatic, R as RemultAsyncLocalStorage, k as Remult, m as getEntityKey, s as serverActionField, n as streamUrl, o as liveQueryKeepAliveRoute, w as withRemult, p as isOfType, _ as __decorate, q as Fields, t as __metadata, u as IdEntity, v as EntityBase, x as cast, y as isAutoIncrement } from './IdEntity-Le34BexZ.js';
import { AsyncLocalStorage } from 'async_hooks';
import 'fs';
import 'path';
import Database from 'better-sqlite3';

/* @internal*/
class LiveQueryPublisher {
    subscriptionServer;
    liveQueryStorage;
    performWithContext;
    constructor(subscriptionServer, liveQueryStorage, performWithContext) {
        this.subscriptionServer = subscriptionServer;
        this.liveQueryStorage = liveQueryStorage;
        this.performWithContext = performWithContext;
    }
    runPromise(p) { }
    debugFileSaver = (x) => { };
    async itemChanged(entityKey, changes) {
        await this.runPromise(this.liveQueryStorage().forEach(entityKey, async ({ query: q, setData }) => {
            let query = { ...q.data };
            await this.performWithContext(query.requestJson, entityKey, async (repo) => {
                const messages = [];
                const currentItems = await repo.find(findOptionsFromJson(query.findOptionsJson, repo.metadata));
                const currentIds = currentItems.map((x) => repo.getEntityRef(x).getId());
                for (const id of query.lastIds.filter((y) => !currentIds.includes(y))) {
                    let c = changes.find((c) => c.oldId == id);
                    if (c === undefined ||
                        id != c.oldId ||
                        !currentIds.includes(c.id))
                        messages.push({
                            type: 'remove',
                            data: {
                                id: id,
                            },
                        });
                }
                for (const item of currentItems) {
                    const itemRef = repo.getEntityRef(item);
                    let c = changes.find((c) => c.id == itemRef.getId());
                    if (c !== undefined && query.lastIds.includes(c.oldId)) {
                        messages.push({
                            type: 'replace',
                            data: {
                                oldId: c.oldId,
                                item: itemRef.toApiJson(),
                            },
                        });
                    }
                    else if (!query.lastIds.includes(itemRef.getId())) {
                        messages.push({
                            type: 'add',
                            data: { item: itemRef.toApiJson() },
                        });
                    }
                }
                this.debugFileSaver({
                    query: q.id,
                    currentIds,
                    changes,
                    lastIds: query.lastIds,
                    messages,
                });
                query.lastIds = currentIds;
                await setData(query);
                if (messages.length > 0)
                    this.subscriptionServer().publishMessage(q.id, messages);
            });
        }));
    }
}
class InMemoryLiveQueryStorage {
    debugFileSaver = (x) => { };
    debug() {
        this.debugFileSaver(this.queries);
    }
    async keepAliveAndReturnUnknownQueryIds(ids) {
        const result = [];
        for (const id of ids) {
            let q = this.queries.find((q) => q.id === id);
            if (q) {
                q.lastUsed = new Date().toISOString();
            }
            else
                result.push(id);
        }
        this.debug();
        return result;
    }
    queries = [];
    constructor() { }
    async add(query) {
        this.queries.push({ ...query, lastUsed: new Date().toISOString() });
        this.debug();
    }
    removeCountForTesting = 0;
    async remove(id) {
        this.queries = this.queries.filter((q) => q.id !== id);
        this.removeCountForTesting++;
        this.debug();
    }
    async forEach(entityKey, handle) {
        let d = new Date();
        d.setMinutes(d.getMinutes() - 5);
        this.queries = this.queries.filter((x) => x.lastUsed > d.toISOString());
        for (const q of this.queries) {
            if (q.entityKey === entityKey) {
                await handle({
                    query: q,
                    setData: async (data) => {
                        q.data = data;
                    },
                });
            }
        }
        this.debug();
    }
}

class SseSubscriptionServer {
    canUserConnectToChannel;
    //@internal
    subscribeToChannel({ channel, clientId }, res, remult, remove = false) {
        for (const c of this.connections) {
            if (c.connectionId === clientId) {
                if (this.canUserConnectToChannel(channel, remult)) {
                    if (remove)
                        delete c.channels[channel];
                    else
                        c.channels[channel] = true;
                    res.success({ status: 'ok' });
                    this.debug();
                    return;
                }
                else {
                    res.forbidden();
                    this.debug();
                    return;
                }
            }
        }
        res.success(ConnectionNotFoundError);
    }
    //@internal
    connections = [];
    constructor(canUserConnectToChannel) {
        this.canUserConnectToChannel = canUserConnectToChannel;
        if (!this.canUserConnectToChannel) {
            this.canUserConnectToChannel = () => true;
        }
    }
    async publishMessage(channel, message) {
        const data = JSON.stringify({ channel, data: message });
        for (const sc of this.connections) {
            if (sc.channels[channel]) {
                this.debugMessageFileSaver(sc.connectionId, channel, message);
                sc.write(data);
            }
        }
    }
    //@internal
    debugMessageFileSaver = (id, channel, message) => { };
    //@internal
    openHttpServerStream(req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });
        const cc = new clientConnection(res);
        //const lastEventId = req.headers['last-event-id'];
        this.connections.push(cc);
        this.debug();
        //@ts-ignore
        req.on('close', () => {
            cc.close();
            this.connections = this.connections.filter((s) => s !== cc);
            this.debug();
        });
        return cc;
    }
    //@internal
    debug() {
        this.debugFileSaver(this.connections.map((x) => ({
            id: x.connectionId,
            channels: x.channels,
        })));
    }
    //@internal
    debugFileSaver = () => { };
}
class clientConnection {
    response;
    channels = {};
    timeOutRef;
    close() {
        if (this.timeOutRef)
            clearTimeout(this.timeOutRef);
        this.closed = true;
    }
    closed = false;
    write(eventData, eventType = 'message') {
        let event = 'event:' + eventType;
        // if (id != undefined)
        //     event += "\nid:" + id;
        this.response.write(event + '\ndata:' + eventData + '\n\n');
        if (this.response.flush)
            this.response.flush();
    }
    connectionId = crypto.randomUUID();
    constructor(response) {
        this.response = response;
        this.write(this.connectionId, 'connectionId');
        this.sendLiveMessage();
    }
    sendLiveMessage() {
        if (this.closed)
            return;
        this.write('', 'keep-alive');
        this.timeOutRef = setTimeout(() => {
            this.sendLiveMessage();
        }, 45000);
    }
}

class DataApi {
    repository;
    remult;
    constructor(repository, remult) {
        this.repository = repository;
        this.remult = remult;
    }
    httpGet(res, req, serializeContext) {
        try {
            const action = req?.get('__action');
            if (action?.startsWith(liveQueryAction))
                return this.liveQuery(res, req, undefined, serializeContext, action.substring(liveQueryAction.length));
            switch (action) {
                case 'get':
                case 'count':
                    return this.count(res, req, undefined);
                case 'groupBy':
                    return res.success(this.groupBy(req, undefined));
            }
            return this.getArray(res, req, undefined);
        }
        catch (err) {
            if (err.isForbiddenError)
                res.forbidden(err);
            else
                res.error(err, this.repository.metadata);
        }
    }
    async httpPost(res, req, body, serializeContext) {
        const action = req?.get('__action');
        function validateWhereInBody() {
            if (!body?.where) {
                throw {
                    message: `POST with action ${action} must have a where clause in the body`,
                    httpStatusCode: 400,
                };
            }
        }
        try {
            if (action?.startsWith(liveQueryAction)) {
                validateWhereInBody();
                return this.liveQuery(res, req, body, serializeContext, action.substring(liveQueryAction.length));
            }
            switch (action) {
                case 'get':
                    validateWhereInBody();
                    return this.getArray(res, req, body);
                case 'count':
                    validateWhereInBody();
                    return this.count(res, req, body);
                case 'groupBy':
                    return res.success(await this.groupBy(req, body));
                case 'deleteMany':
                    validateWhereInBody();
                    return this.deleteMany(res, req, body);
                case 'updateMany':
                    validateWhereInBody();
                    return this.updateManyImplementation(res, req, body);
                case 'upsertMany':
                    return this.upsertMany(res, req, body);
                case 'endLiveQuery':
                    await this.remult.liveQueryStorage.remove(body.id);
                    res.success('ok');
                    return;
                case 'query':
                    return res.success(await this.query(res, req, body));
                default:
                    return res.created(await this.post(body, req));
            }
        }
        catch (err) {
            if (err.isForbiddenError)
                res.forbidden(err.message);
            else
                res.error(err, this.repository.metadata);
        }
    }
    async upsertMany(response, request, body) {
        return await doTransaction(this.remult, async () => {
            let result = [];
            for (const item of body) {
                let where = await this.buildWhere(request, { where: item.where });
                Filter.throwErrorIfFilterIsEmpty(where, 'upsert');
                let r = await this.repository.find({
                    where,
                    include: this.includeNone(),
                });
                if (r.length == 0) {
                    result.push(await this.post({ ...item.where, ...item.set }, request));
                }
                else {
                    if (item.set !== undefined) {
                        result.push(await this.actualUpdate(r[0], item.set, request));
                    }
                    else
                        result.push(this.repository.getEntityRef(r[0]).toApiJson());
                }
            }
            response.success(result);
        });
    }
    async query(response, request, body) {
        if (!this.repository.metadata.apiReadAllowed) {
            response.forbidden();
            return;
        }
        try {
            let { aggregate, ...rest } = body;
            let [{ r }, [aggregates]] = await Promise.all([
                this.getArrayImpl(request, rest),
                this.groupBy(request, { ...aggregate, where: body.where }),
            ]);
            return {
                items: r,
                aggregates,
            };
        }
        catch (err) {
            if (err.isForbiddenError)
                response.forbidden();
            else
                response.error(err, this.repository.metadata);
        }
    }
    static defaultGetLimit = 0;
    async get(response, id) {
        if (!this.repository.metadata.apiReadAllowed) {
            response.forbidden();
            return;
        }
        await this.doOnId(response, id, async (row) => response.success(this.repository.getEntityRef(row).toApiJson()));
    }
    async count(response, request, body) {
        if (!this.repository.metadata.apiReadAllowed) {
            response.forbidden();
            return;
        }
        try {
            response.success({
                count: +(await this.repository.count(await this.buildWhere(request, body))),
            });
        }
        catch (err) {
            response.error(err, this.repository.metadata);
        }
    }
    async deleteMany(response, request, body) {
        try {
            let deleted = 0;
            let where = await this.prepareWhereForManyOperation(body, request);
            return await doTransaction(this.remult, async () => {
                for await (const x of this.repository.query({
                    where,
                    include: this.includeNone(),
                    aggregate: undefined,
                })) {
                    await this.actualDelete(x);
                    deleted++;
                }
                response.success({ deleted });
            });
        }
        catch (err) {
            response.error(err, this.repository.metadata);
        }
    }
    async prepareWhereForManyOperation(body, request) {
        let where = undefined;
        if (body?.where !== 'all') {
            where = await this.buildWhere(request, body);
            Filter.throwErrorIfFilterIsEmpty(where, 'deleteMany');
        }
        return where;
    }
    async groupBy(request, body) {
        if (!this.repository.metadata.apiReadAllowed) {
            throw new ForbiddenError();
        }
        let findOptions = await this.findOptionsFromRequest(request, body);
        let orderBy = {};
        if (body?.orderBy) {
            for (const element of body?.orderBy) {
                const direction = element.isDescending ? 'desc' : 'asc';
                switch (element.operation) {
                    case undefined:
                        orderBy[element.field] = direction;
                        break;
                    case 'count':
                        orderBy[GroupByCountMember] = direction;
                        break;
                    default:
                        orderBy[element.field] = {
                            ...orderBy[element.field],
                            [element.operation]: direction,
                        };
                        break;
                }
            }
        }
        const group = body?.groupBy?.filter((x) => this.repository.fields.find(x).includedInApi());
        const min = body?.min?.filter((x) => this.repository.fields.find(x).includedInApi());
        const max = body?.max?.filter((x) => this.repository.fields.find(x).includedInApi());
        let result = await this.repository.groupBy({
            where: findOptions.where,
            limit: findOptions.limit,
            page: findOptions.page,
            //@ts-expect-error internal key
            [GroupByForApiKey]: true,
            group,
            sum: body?.sum?.filter((x) => this.repository.fields.find(x).includedInApi()),
            avg: body?.avg?.filter((x) => this.repository.fields.find(x).includedInApi()),
            min,
            max,
            distinctCount: body?.distinctCount?.filter((x) => this.repository.fields.find(x).includedInApi()),
            orderBy: orderBy,
        });
        if (group)
            result.forEach((x) => {
                for (const f of group) {
                    x[f] = this.repository.fields.find(f).valueConverter.toJson(x[f]);
                }
            });
        const minMax = { min, max };
        for (const element of ['min', 'max']) {
            if (minMax[element])
                result.forEach((x) => {
                    for (const f of minMax[element]) {
                        x[f][element] = this.repository.fields
                            .find(f)
                            .valueConverter.toJson(x[f][element]);
                    }
                });
        }
        return result;
    }
    async getArrayImpl(request, body) {
        let findOptions = await this.findOptionsFromRequest(request, body);
        const r = await this.repository.find(findOptions).then(async (r) => {
            return await Promise.all(r.map(async (y) => this.repository.getEntityRef(y).toApiJson()));
        });
        return { r, findOptions };
    }
    async findOptionsFromRequest(request, body) {
        let findOptions = {
            load: () => [],
            include: this.includeNone(),
        };
        findOptions.where = await this.buildWhere(request, body);
        if (body?.args)
            findOptions.args = body.args;
        if (request) {
            let sort = request.get('_sort');
            if (sort != undefined) {
                let dir = request.get('_order');
                findOptions.orderBy = determineSort(sort, dir);
            }
            let limit = +request.get('_limit');
            if (!limit && DataApi.defaultGetLimit)
                limit = DataApi.defaultGetLimit;
            findOptions.limit = limit;
            findOptions.page = +request.get('_page');
            const select = request.get('_select');
            if (select) {
                findOptions.select = select
                    .split(',')
                    .reduce((acc, key) => {
                    acc[key] = true;
                    return acc;
                }, {});
            }
        }
        if (this.remult.isAllowed(this.repository.metadata.options.apiRequireId)) {
            let hasId = false;
            let w = await Filter.fromEntityFilter(this.repository.metadata, findOptions.where);
            if (w) {
                w.__applyToConsumer({
                    containsCaseInsensitive: () => { },
                    notContainsCaseInsensitive: () => { },
                    startsWithCaseInsensitive: () => { },
                    endsWithCaseInsensitive: () => { },
                    isDifferentFrom: () => { },
                    isEqualTo: (col, val) => {
                        if (this.repository.metadata.idMetadata.isIdField(col))
                            hasId = true;
                    },
                    custom: () => { },
                    databaseCustom: () => { },
                    isGreaterOrEqualTo: () => { },
                    isGreaterThan: () => { },
                    isIn: (col) => {
                        if (this.repository.metadata.idMetadata.isIdField(col))
                            hasId = true;
                    },
                    isLessOrEqualTo: () => { },
                    isLessThan: () => { },
                    isNotNull: () => { },
                    isNull: () => { },
                    not: () => { },
                    or: () => { },
                });
            }
            if (!hasId) {
                throw new ForbiddenError();
            }
        }
        return findOptions;
    }
    includeNone() {
        let include = {};
        for (const field of this.repository.metadata.fields) {
            if (getRelationFieldInfo(field)) {
                include[field.key] = false;
            }
        }
        return include;
    }
    async getArray(response, request, body) {
        if (!this.repository.metadata.apiReadAllowed) {
            response.forbidden();
            return;
        }
        try {
            const { r } = await this.getArrayImpl(request, body);
            response.success(r);
        }
        catch (err) {
            if (err.isForbiddenError)
                response.forbidden(err.message);
            else
                response.error(err, this.repository.metadata);
        }
    }
    async liveQuery(response, request, body, serializeContext, queryChannel) {
        if (!this.repository.metadata.apiReadAllowed) {
            response.forbidden();
            return;
        }
        try {
            const r = await this.getArrayImpl(request, body);
            const data = {
                requestJson: await serializeContext(),
                findOptionsJson: findOptionsToJson(r.findOptions, this.repository.metadata),
                lastIds: r.r.map((y) => this.repository.metadata.idMetadata.getId(y)),
            };
            await this.remult.liveQueryStorage.add({
                entityKey: this.repository.metadata.key,
                id: queryChannel,
                data,
            });
            response.success(r.r);
        }
        catch (err) {
            if (err.isForbiddenError)
                response.forbidden();
            else
                response.error(err, this.repository.metadata);
        }
    }
    async buildWhere(request, body) {
        var where = [];
        if (this.repository.metadata.options.apiPrefilter) {
            if (typeof this.repository.metadata.options.apiPrefilter === 'function')
                where.push(await this.repository.metadata.options.apiPrefilter());
            else
                where.push(this.repository.metadata.options.apiPrefilter);
        }
        if (request) {
            let f = buildFilterFromRequestParameters(this.repository.metadata, {
                get: (key) => {
                    let result = body?.where?.[key];
                    if (result !== undefined)
                        return result;
                    result = request.get(key);
                    if (key.startsWith(customUrlToken) &&
                        result &&
                        typeof result === 'string')
                        return JSON.parse(result);
                    return result;
                },
            });
            if (this.repository.metadata.options.apiPreprocessFilter) {
                f = await this.repository.metadata.options.apiPreprocessFilter(f, {
                    metadata: this.repository.metadata,
                    getFilterPreciseValues: async (filter) => {
                        return Filter.getPreciseValues(this.repository.metadata, filter || f);
                    },
                });
            }
            where.push(f);
        }
        return { $and: where };
    }
    async doOnId(response, id, what) {
        try {
            var where = [
                this.repository.metadata.idMetadata.getIdFilter(id),
            ];
            if (this.repository.metadata.options.apiPrefilter) {
                if (typeof this.repository.metadata.options.apiPrefilter === 'function')
                    where.push(await this.repository.metadata.options.apiPrefilter());
                else
                    where.push(this.repository.metadata.options.apiPrefilter);
            }
            await this.repository
                .find({
                where: { $and: where },
                include: this.includeNone(),
            })
                .then(async (r) => {
                if (r.length == 0)
                    response.notFound();
                else if (r.length > 1)
                    response.error({
                        message: `id "${id}" is not unique for entity ` +
                            this.repository.metadata.key,
                    }, this.repository.metadata, 400);
                else
                    await what(r[0]);
            });
        }
        catch (err) {
            response.error(err, this.repository.metadata);
        }
    }
    async updateManyThroughPutRequest(response, request, body) {
        const action = request?.get('__action');
        if (action == 'emptyId') {
            return this.put(response, request, '', body);
        }
        return this.updateManyImplementation(response, request, {
            where: undefined,
            set: body,
        });
    }
    async updateManyImplementation(response, request, body) {
        try {
            let where = await this.prepareWhereForManyOperation(body, request);
            return await doTransaction(this.remult, async () => {
                let updated = 0;
                for await (const x of this.repository.query({
                    where,
                    include: this.includeNone(),
                    aggregate: undefined,
                })) {
                    await this.actualUpdate(x, body.set, request);
                    updated++;
                }
                response.success({ updated });
            });
        }
        catch (err) {
            response.error(err, this.repository.metadata);
        }
    }
    async actualUpdate(row, body, req, doNotSelect) {
        let ref = this.repository.getEntityRef(row);
        await ref._updateEntityBasedOnApi(body);
        if (!ref.apiUpdateAllowed) {
            throw new ForbiddenError();
        }
        let options = req.get('_select') === 'none' || doNotSelect
            ? { select: 'none' }
            : undefined;
        await ref.save(options);
        if (options?.select === 'none')
            return undefined;
        return ref.toApiJson();
    }
    async put(response, req, id, body) {
        await this.doOnId(response, id, async (row) => response.success(await this.actualUpdate(row, body, req)));
    }
    async actualDelete(row) {
        if (!this.repository.getEntityRef(row).apiDeleteAllowed) {
            throw new ForbiddenError();
        }
        await this.repository.getEntityRef(row).delete();
    }
    async delete(response, id) {
        await this.doOnId(response, id, async (row) => {
            await this.actualDelete(row);
            response.deleted();
        });
    }
    async post(body, req) {
        let options = req.get('_select') === 'none' ? { select: 'none' } : undefined;
        const insert = async (what) => {
            let newr = this.repository.create();
            await this.repository.getEntityRef(newr)._updateEntityBasedOnApi(what);
            if (!this.repository.getEntityRef(newr).apiInsertAllowed) {
                throw new ForbiddenError();
            }
            await this.repository.getEntityRef(newr).save(options);
            if (options?.select === 'none')
                return undefined;
            return this.repository.getEntityRef(newr).toApiJson();
        };
        if (Array.isArray(body)) {
            const result = [];
            await doTransaction(this.remult, async () => {
                for (const item of body) {
                    result.push(await insert(item));
                }
            });
            return result;
        }
        else
            return await insert(body);
    }
}
function determineSort(sortUrlParm, dirUrlParam) {
    let dirItems = [];
    if (dirUrlParam)
        dirItems = dirUrlParam.split(',');
    let result = {};
    sortUrlParm.split(',').map((name, i) => {
        let key = name.trim();
        if (i < dirItems.length && dirItems[i].toLowerCase().trim().startsWith('d'))
            return (result[key] = 'desc');
        else
            return (result[key] = 'asc');
    });
    return result;
}
function serializeError(data) {
    if (data instanceof EntityError) {
        data = { message: data.message, modelState: data.modelState };
    }
    else if (data instanceof Error) {
        data = { message: data.message, stack: data.stack };
    }
    let x = JSON.parse(JSON.stringify(data));
    if (!x.message && !x.modelState)
        data = { message: data.message, stack: data.stack };
    if (typeof x === 'string')
        data = { message: x };
    return data;
}

function buildEntityInfo(options) {
    const entities = [];
    for (const metadata of options.entities.map((e) => options.remult.repo(e).metadata)) {
        let fields = [];
        let relations = [];
        let ids = {};
        for (const f of metadata.idMetadata.fields) {
            ids[f.key] = true;
        }
        for (const x of metadata.fields.toArray()) {
            if (!x.includedInApi(undefined))
                continue;
            try {
                let relation;
                let valFieldKey = x.key;
                const info = getRelationFieldInfo(x);
                if (info) {
                    const relInfo = info.getFields();
                    const relRepo = options.remult.repo(info.toEntity);
                    const where = typeof info.options.findOptions === 'object' &&
                        info.options.findOptions.where
                        ? Filter.entityFilterToJson(relRepo.metadata, info.options.findOptions.where)
                        : undefined;
                    const idField = relRepo.metadata.idMetadata.field.key;
                    if (info.type === 'reference' || info.type === 'toOne') {
                        if (info.type == 'toOne') {
                            for (const key in relInfo.fields) {
                                if (Object.prototype.hasOwnProperty.call(relInfo.fields, key)) {
                                    const element = relInfo.fields[key];
                                    valFieldKey = element;
                                }
                            }
                        }
                        if (relRepo.metadata.apiReadAllowed) {
                            relation = {
                                ...relInfo,
                                allowNull: x.allowNull,
                                where,
                                entityKey: relRepo.metadata.key,
                                idField,
                                captionField: relRepo.metadata.fields
                                    .toArray()
                                    .find((x) => x.key != idField && x.valueType == String)?.key,
                            };
                        }
                    }
                    else if (info.type === 'toMany') {
                        if (relRepo.metadata.apiReadAllowed) {
                            relations.push({
                                ...relInfo,
                                where,
                                entityKey: relRepo.metadata.key,
                                key: x.key,
                                caption: x.label,
                            });
                        }
                        continue;
                    }
                }
                fields.push({
                    key: x.key,
                    readOnly: !x.apiUpdateAllowed(),
                    values: getValueList(x),
                    valFieldKey,
                    caption: x.label,
                    relationToOne: relation,
                    inputType: x.inputType,
                    allowNull: x.allowNull,
                    type: x.inputType === InputTypes.json
                        ? 'json'
                        : x.valueType === Number
                            ? 'number'
                            : x.valueType === Boolean
                                ? 'boolean'
                                : x.valueType === Date
                                    ? 'date'
                                    : 'string',
                });
            }
            catch (error) {
                console.error(`[remult-admin] Error with ${metadata.key}.${x.key} field.`);
                console.error(`[remult-admin]`, error);
            }
        }
        if (metadata.apiReadAllowed) {
            let superKey = metadata.key;
            let caption = metadata.label;
            const nbOfEntities = entities.filter((e) => e.key === metadata.key).length;
            if (nbOfEntities > 0) {
                superKey = metadata.key + '_ext_' + nbOfEntities;
                caption = metadata.label + '*'.repeat(nbOfEntities);
            }
            entities.push({
                superKey,
                key: metadata.key,
                caption,
                ids,
                fields,
                relations,
                defaultOrderBy: metadata.options.defaultOrderBy ?? { id: 'asc' },
            });
        }
    }
    return entities;
}

function initDataProviderOrJson(dataProvider) {
    return initDataProvider(dataProvider, false, async () => {
        return new (await import('./JsonEntityFileStorage-D7ml5ZKx.js')).JsonFileDataProvider('./db');
    });
}

/**
 * Full flat and ordered list by index and concatenaining the modules name
 */
const modulesFlatAndOrdered = (modules) => {
    const flattenModules = (modules, parentName = '') => {
        return modules.reduce((acc, module) => {
            const fullKey = parentName ? `${parentName}-${module.key}` : module.key;
            // Create a new module object without the 'modules' property
            const { modules: _, ...flatModule } = module;
            const newModule = { ...flatModule, key: fullKey };
            const subModules = module.modules
                ? flattenModules(module.modules, fullKey)
                : [];
            return [...acc, newModule, ...subModules];
        }, []);
    };
    const flatModules = flattenModules(modules);
    flatModules.sort((a, b) => a.priority - b.priority);
    return flatModules;
};

function createRemultServerCore(options, serverCoreOptions) {
    const safeOptions = options ?? {};
    if (!safeOptions.entities)
        safeOptions.entities = [];
    if (!safeOptions.subscriptionServer) {
        safeOptions.subscriptionServer = new SseSubscriptionServer();
    }
    if (safeOptions.logApiEndPoints === undefined)
        safeOptions.logApiEndPoints = true;
    remultStatic.actionInfo.runningOnServer = true;
    if (safeOptions.defaultGetLimit) {
        DataApi.defaultGetLimit = safeOptions.defaultGetLimit;
    }
    if (!safeOptions.queueStorage) {
        safeOptions.queueStorage = new InMemoryQueueStorage();
    }
    let dataProvider = initDataProviderOrJson(safeOptions.dataProvider);
    remultStatic.defaultDataProvider = () => dataProvider;
    if (safeOptions.ensureSchema === undefined)
        safeOptions.ensureSchema = true;
    if (!serverCoreOptions.ignoreAsyncStorage)
        RemultAsyncLocalStorage.enable();
    {
        let allControllers = [];
        if (safeOptions.entities)
            allControllers.push(...safeOptions.entities);
        if (safeOptions.controllers)
            allControllers.push(...safeOptions.controllers);
        safeOptions.controllers = allControllers;
    }
    if (safeOptions.rootPath === undefined)
        safeOptions.rootPath = '/api';
    remultStatic.actionInfo.runningOnServer = true;
    let bridge = new RemultServerImplementation(new inProcessQueueHandler(safeOptions.queueStorage), safeOptions, dataProvider, serverCoreOptions);
    return bridge;
}
/* @internal*/
class RemultServerImplementation {
    queue;
    options;
    dataProvider;
    coreOptions;
    liveQueryStorage = new InMemoryLiveQueryStorage();
    modulesSorted = [];
    entities = [];
    controllers = [];
    constructor(queue, options, dataProvider, coreOptions) {
        this.queue = queue;
        this.options = options;
        this.dataProvider = dataProvider;
        this.coreOptions = coreOptions;
        if (options.liveQueryStorage)
            this.liveQueryStorage = options.liveQueryStorage;
        if (options.subscriptionServer)
            this.subscriptionServer = options.subscriptionServer;
        const entitiesMetaData = [];
        const modules = options.modules ?? [];
        modules.push({
            key: 'default',
            priority: 0,
            entities: options.entities ?? [],
            controllers: options.controllers ?? [],
            initApi: options.initApi,
            initRequest: options.initRequest,
            modules: [],
        });
        this.modulesSorted = modulesFlatAndOrdered(modules);
        this.entities = this.modulesSorted.flatMap((m) => m.entities ?? []);
        this.controllers = this.modulesSorted.flatMap((m) => m.controllers ?? []);
        this.dataProvider = dataProvider.then(async (dp) => {
            await this.runWithRemult(async (remult) => {
                remult.dataProvider = dp;
                if (options.ensureSchema) {
                    let started = false;
                    const startConsoleLog = () => {
                        if (started)
                            return;
                        started = true;
                        console.time('Schema ensured');
                    };
                    if (this.entities)
                        entitiesMetaData.push(...this.entities.map((e) => remult.repo(e).metadata));
                    if (dp.ensureSchema) {
                        startConsoleLog();
                        await dp.ensureSchema(entitiesMetaData);
                    }
                    for (const item of [
                        options.liveQueryStorage,
                        options.queueStorage,
                    ]) {
                        if (item?.ensureSchema) {
                            startConsoleLog();
                            await item.ensureSchema();
                        }
                    }
                    if (started)
                        console.timeEnd('Schema ensured');
                }
                for (let i = 0; i < this.modulesSorted.length; i++) {
                    const _initApi = this.modulesSorted[i].initApi;
                    if (_initApi) {
                        await _initApi(remult);
                    }
                }
            }, { skipDataProvider: true });
            return dp;
        });
    }
    withRemultAsync(request, what) {
        if (!request)
            return this.runWithRemult(what);
        return new Promise(async (resolve, error) => {
            try {
                return await this.withRemult(request, undefined, async () => {
                    try {
                        what().then(resolve).catch(error);
                    }
                    catch (err) {
                        error(err);
                    }
                });
            }
            catch (err) {
                error(err);
            }
        });
    }
    getEntities() {
        //TODO V2 - consider using entitiesMetaData - but it may require making it all awaitable
        var r = new Remult();
        return this.entities.map((x) => r.repo(x).metadata);
    }
    runWithSerializedJsonContextData = async (jsonContextData, entityKey, what) => {
        for (const e of this.entities) {
            let key = getEntityKey(e);
            if (key === entityKey) {
                await this.runWithRemult(async (remult) => {
                    remult.user = jsonContextData.user;
                    if (this.options.contextSerializer) {
                        await this.options.contextSerializer.deserialize(jsonContextData.context, {
                            remult,
                            get liveQueryStorage() {
                                return remult.liveQueryStorage;
                            },
                            set liveQueryStorage(value) {
                                remult.liveQueryStorage = value;
                            },
                        });
                    }
                    await what(remult.repo(e));
                });
                return;
            }
        }
        throw new Error("Couldn't find entity " + entityKey);
    };
    subscriptionServer;
    withRemult = async (req, res, next) => {
        await this.process(async () => {
            await next();
        }, true)(req, res);
    };
    routeImpl;
    getRouteImpl() {
        if (!this.routeImpl) {
            this.routeImpl = new RouteImplementation(this.coreOptions);
            this.registerRouter(this.routeImpl);
        }
        return this.routeImpl;
    }
    handle(req, gRes) {
        return this.getRouteImpl().handle(req, gRes);
    }
    registeredRouter = false;
    registerRouter(r) {
        if (this.registeredRouter)
            throw 'Router already registered';
        this.registeredRouter = true;
        {
            for (const c of this.controllers) {
                let z = c[classBackendMethodsArray];
                if (z)
                    for (const a of z) {
                        let x = a[serverActionField];
                        if (!x) {
                            throw 'failed to set server action, did you forget the BackendMethod Decorator?';
                        }
                        this.addAction(x, r);
                    }
            }
            if (this.hasQueue)
                this.addAction({
                    __register: (x) => {
                        x(Action.apiUrlForJobStatus, false, () => true, async (data, req, res) => {
                            let job = await this.queue.getJobInfo(data.queuedJobId);
                            let userId = undefined;
                            if (req?.user)
                                userId = req.user.id;
                            if (job.userId == '')
                                job.userId = undefined;
                            if (userId != job.userId)
                                res.forbidden();
                            else
                                res.success(job.info);
                        });
                    },
                    doWork: undefined,
                }, r);
            if (this.options.admin !== undefined && this.options.admin !== false) {
                const admin = () => this.process(async (remult, req, res, orig, origResponse) => {
                    const allowed = isOfType(this.options.admin, 'allow')
                        ? this.options.admin.allow
                        : this.options.admin;
                    if (remult.isAllowed(allowed)) {
                        if (orig?.params?.id === '__entities-metadata') {
                            res.success(buildEntityInfo({
                                remult,
                                entities: this.entities,
                            }));
                        }
                        else {
                            let head = '<title>Admin</title>';
                            let requireAuthToken = false;
                            let disableLiveQuery = false;
                            if (isOfType(this.options.admin, 'allow')) {
                                head = this.options.admin.customHtmlHead?.(remult) ?? head;
                                requireAuthToken =
                                    this.options.admin.requireAuthToken ?? requireAuthToken;
                                disableLiveQuery =
                                    this.options.admin.disableLiveQuery ?? disableLiveQuery;
                            }
                            // Lazy-load the ~1.4MB admin HTML module only when the admin
                            // page is actually requested, so it is never pulled into the
                            // bundle of apps that don't serve the admin UI.
                            const { default: remultAdminHtml } = await import('./remult-admin-html-Dzcv-XAS.js');
                            origResponse.send(remultAdminHtml({
                                rootPath: this.options.rootPath ?? '/api',
                                head,
                                requireAuthToken,
                                disableLiveQuery,
                            }));
                        }
                    }
                    else
                        res.notFound();
                });
                r.route(this.options.rootPath + '/admin/:id').get(admin());
                r.route(this.options.rootPath + '/admin/').get(admin());
                r.route(this.options.rootPath + '/admin').get(admin());
            }
            r.route(this.options.rootPath + '/me').get(this.process(async (remult, req, res) => res.success(remult.user ?? null)));
            if (this.options.subscriptionServer instanceof SseSubscriptionServer) {
                const streamPath = this.options.rootPath + '/' + streamUrl;
                r.route(streamPath).get(this.process(async (remult, req, res, origReq, origRes) => {
                    remult.subscriptionServer.openHttpServerStream(origReq, origRes);
                }));
                r.route(streamPath + '/subscribe').post(this.process(async (remult, _2, res, _, _1, origReq) => {
                    remult.subscriptionServer.subscribeToChannel(await this.coreOptions.getRequestBody(origReq), res, remult);
                }));
                r.route(streamPath + '/unsubscribe').post(this.process(async (remult, req, res, reqInfo, origRes, origReq) => {
                    remult.subscriptionServer.subscribeToChannel(await this.coreOptions.getRequestBody(origReq), res, remult, true);
                }));
            }
            r.route(this.options.rootPath + '/' + liveQueryKeepAliveRoute).post(this.process(async (remult, req, res, reqInfo, origRes, origReq) => {
                res.success(await remult.liveQueryStorage.keepAliveAndReturnUnknownQueryIds(await this.coreOptions.getRequestBody(origReq)));
            }));
        }
        this.entities.forEach((e) => {
            this.addEntity(e, getEntityKey(e), r);
        });
    }
    __addEntityForTesting(e) {
        this.addEntity(e.entityType, e.key, this.getRouteImpl());
    }
    addEntity(e, key, r) {
        if (key != undefined)
            this.add(key, (c) => {
                return new DataApi(c.repo(e), c);
            }, r);
    }
    async serializeContext(remult) {
        let result = {
            user: remult.user,
            context: undefined,
        };
        if (this.options.contextSerializer) {
            result.context = await this.options.contextSerializer.serialize(remult);
        }
        return result;
    }
    add(key, dataApiFactory, r) {
        let myRoute = this.options.rootPath + '/' + key;
        if (this.options.logApiEndPoints)
            console.info('[remult] ' + myRoute);
        r.route(myRoute)
            .get(this.process(async (c, req, res, orig) => dataApiFactory(c).httpGet(res, req, () => this.serializeContext(c))))
            .put(this.process(async (c, req, res, _, __, orig) => dataApiFactory(c).updateManyThroughPutRequest(res, req, await this.coreOptions.getRequestBody(orig))))
            .delete(this.process(async (c, req, res, _, __, orig) => dataApiFactory(c).deleteMany(res, req, undefined)))
            .post(this.process(async (c, req, res, _, __, orig) => dataApiFactory(c).httpPost(res, req, await this.coreOptions.getRequestBody(orig), () => this.serializeContext(c))));
        r.route(myRoute + '/:id')
            //@ts-ignore
            .get(this.process(async (c, req, res, orig) => dataApiFactory(c).get(res, orig.params.id)))
            //@ts-ignore
            .put(this.process(async (c, req, res, reqInfo, _, orig) => dataApiFactory(c).put(res, req, reqInfo.params.id, await this.coreOptions.getRequestBody(orig))))
            //@ts-ignore
            .delete(this.process(async (c, req, res, orig) => dataApiFactory(c).delete(res, orig.params.id)));
    }
    //runs with remult but without init request
    async runWithRemult(what, options) {
        let dataProvider;
        if (!options?.skipDataProvider)
            dataProvider = await this.dataProvider;
        return await withRemult(async (remult) => {
            var x = remult;
            x.liveQueryPublisher = new LiveQueryPublisher(() => remult.subscriptionServer, () => remult.liveQueryStorage, this.runWithSerializedJsonContextData);
            if (!options?.skipDataProvider)
                x.dataProvider = dataProvider;
            x.subscriptionServer = this.subscriptionServer;
            x.liveQueryStorage = this.liveQueryStorage;
            return await what(x);
        }, {
            dataProvider: dataProvider,
        });
    }
    process(what, doNotReuseInitRequest) {
        return async (req, origRes) => {
            const { internal: genReq, public: genReqPublic, } = req
                ? this.coreOptions.buildGenericRequestInfo(req)
                : { internal: {}, public: { headers: new Headers() } };
            if (req) {
                if (!genReq.query) {
                    genReq.query = req['_tempQuery'];
                }
                if (!genReq.params)
                    genReq.params = req['_tempParams'];
            }
            let myReq = new RequestBridgeToDataApiRequest(genReq);
            let myRes = new ResponseBridgeToDataApiResponse(origRes, req, genReq, this.options.error);
            try {
                if (remultStatic.asyncContext.isInInitRequest() &&
                    !doNotReuseInitRequest)
                    return await what(remultStatic.asyncContext.getStore().remult, myReq, myRes, genReq, origRes, req);
                else
                    await this.runWithRemult(async (remult) => {
                        if (req) {
                            ;
                            remult.context.request = req;
                            remult.context.headers = {
                                get: (key) => genReqPublic.headers.get(key) ?? undefined,
                                getAll: () => {
                                    const result = {};
                                    genReqPublic.headers.forEach((value, key) => {
                                        result[key] = value;
                                    });
                                    return result;
                                },
                            };
                            remultStatic.asyncContext.setInInitRequest(true);
                            try {
                                let user;
                                if (this.options.getUser)
                                    user = await this.options.getUser(req);
                                else {
                                    user = req['user'];
                                    if (!user)
                                        user = req['auth'];
                                    if (!user?.id)
                                        user = undefined;
                                }
                                if (user)
                                    remult.user = user;
                                for (let i = 0; i < this.modulesSorted.length; i++) {
                                    const _initRequest = this.modulesSorted[i].initRequest;
                                    if (_initRequest) {
                                        await _initRequest(req, {
                                            remult,
                                            get liveQueryStorage() {
                                                return remult.liveQueryStorage;
                                            },
                                            set liveQueryStorage(value) {
                                                remult.liveQueryStorage = value;
                                            },
                                        });
                                    }
                                }
                                await what(remult, myReq, myRes, genReq, origRes, req);
                            }
                            finally {
                                remultStatic.asyncContext.setInInitRequest(false);
                            }
                        }
                    });
            }
            catch (err) {
                if (origRes)
                    myRes.error(err, undefined);
                else
                    throw err;
            }
        };
    }
    async getRemult(req) {
        let remult;
        if (!req)
            return await this.runWithRemult(async (c) => (remult = c));
        await this.process(async (c) => {
            remult = c;
        })(req, undefined);
        return remult;
    }
    hasQueue = false;
    addAction(action, r) {
        action.__register((url, queue, allowed, what) => {
            let myUrl = this.options.rootPath + '/' + url;
            let tag = (() => {
                let split = url.split('/');
                if (split.length == 1)
                    return 'Static Backend Methods';
                else
                    return split[0];
            })();
            this.backendMethodsOpenApi.push({ path: myUrl, allowed, tag });
            if (this.options.logApiEndPoints)
                console.info('[remult] ' + myUrl);
            if (queue) {
                this.hasQueue = true;
                this.queue.mapQueuedAction(myUrl, what);
            }
            r.route(myUrl).post(this.process(async (remult, req, res, _, __, orig) => {
                if (queue) {
                    let r = {
                        queuedJobId: await this.queue.submitJob(myUrl, remult, await this.coreOptions.getRequestBody(orig)),
                    };
                    res.success(r);
                }
                else
                    return what(await this.coreOptions.getRequestBody(orig), remult, res);
            }));
        });
    }
    openApiDoc(options) {
        if (!options.version)
            options.version = '1.0.0';
        let spec = {
            info: { title: options.title, version: options.version },
            openapi: '3.0.0',
            //swagger: "2.0",
            components: {
                schemas: {},
                securitySchemes: {
                    bearerAuth: {
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        type: 'http',
                    },
                },
            },
            paths: {},
        };
        let validationError = {
            '400': {
                description: 'Error: Bad Request',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/InvalidResponse',
                        },
                    },
                },
            },
        };
        let security = {
            security: [
                {
                    bearerAuth: [],
                },
            ],
        };
        let secureBase = (condition, def, item) => {
            if (condition === undefined)
                condition = def;
            if (condition != false) {
                if (condition != true) {
                    item = { ...item, ...security };
                    item.responses['403'] = { description: 'forbidden' };
                }
                return item;
            }
        };
        for (const meta of this.getEntities()) {
            let key = meta.key;
            let parameters = [];
            if (key) {
                let mutationKey = key;
                let properties = {};
                let mutationProperties = {};
                for (const f of meta.fields) {
                    let type = f.valueType == String
                        ? 'string'
                        : f.valueType == Boolean
                            ? 'boolean'
                            : f.valueType == Date
                                ? 'string'
                                : f.valueType == Number
                                    ? 'number'
                                    : 'object';
                    if (f.options.includeInApi !== false) {
                        properties[f.key] = {
                            type,
                        };
                        if (f.options.allowApiUpdate !== false) {
                            mutationProperties[f.key] = {
                                type,
                            };
                        }
                        parameters.push({
                            name: f.key,
                            in: 'query',
                            description: 'filter equal to ' +
                                f.key +
                                '. See [more filtering options](https://remult.dev/docs/rest-api.html#filter)',
                            required: false,
                            style: 'simple',
                            type,
                        });
                    }
                }
                spec.components.schemas[key] = {
                    type: 'object',
                    properties,
                };
                if (JSON.stringify(properties) !== JSON.stringify(mutationProperties)) {
                    mutationKey += 'Mutation';
                    spec.components.schemas[mutationKey] = {
                        type: 'object',
                        properties: mutationProperties,
                    };
                }
                let definition = {
                    $ref: '#/components/schemas/' + key,
                };
                let secure = (condition, def, item) => {
                    item.tags = [meta.key];
                    if (condition === undefined)
                        condition = meta.options.allowApiCrud;
                    return secureBase(condition, def, item);
                };
                let apiPath = (spec.paths[this.options.rootPath + '/' + key] = {});
                let itemInBody = {
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/' + mutationKey,
                                },
                            },
                        },
                    },
                };
                let apiPathWithId = (spec.paths[this.options.rootPath + '/' + key + '/{id}'] = {});
                //https://github.com/2fd/open-api.d.ts
                apiPath.get = secure(meta.options.allowApiRead, true, {
                    description: 'return an array of ' +
                        key +
                        '. supports filter operators. For more info on filtering [see this article](https://remult.dev/docs/rest-api.html#filter)',
                    parameters: [
                        {
                            name: '_limit',
                            in: 'query',
                            description: 'limit the number of returned rows, default 100',
                            required: false,
                            style: 'simple',
                            schema: { type: 'integer' },
                        },
                        {
                            name: '_page',
                            in: 'query',
                            description: 'to be used for paging',
                            required: false,
                            schema: { type: 'integer' },
                        },
                        {
                            name: '_sort',
                            in: 'query',
                            description: 'the columns to sort on',
                            required: false,
                            schema: { type: 'string' },
                        },
                        {
                            name: '_order',
                            in: 'query',
                            description: 'the sort order to user for the columns in `_sort`',
                            required: false,
                            schema: { type: 'string' },
                        },
                        ...parameters,
                    ],
                    responses: {
                        '200': {
                            description: 'returns an array of ' + key,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: definition,
                                    },
                                },
                            },
                        },
                    },
                });
                apiPath.delete = secure(meta.options.allowApiDelete, true, {
                    description: 'deletes row of ' +
                        key +
                        '. supports filter operators. For more info on filtering [see this article](https://remult.dev/docs/rest-api.html#filter)',
                    parameters: [...parameters],
                    responses: {
                        '400': {
                            description: 'Error: Bad Request',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/InvalidResponse',
                                    },
                                },
                            },
                        },
                        '200': {
                            description: 'returns the number of deleted rows ' + key,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            deleted: {
                                                type: 'number',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                });
                apiPath.put = secure(meta.options.allowApiDelete, true, {
                    description: 'updates row of ' +
                        key +
                        '. supports filter operators. For more info on filtering [see this article](https://remult.dev/docs/rest-api.html#filter)',
                    parameters: [...parameters],
                    ...itemInBody,
                    responses: {
                        '400': {
                            description: 'Error: Bad Request',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/InvalidResponse',
                                    },
                                },
                            },
                        },
                        '200': {
                            description: 'returns the number of updated rows ' + key,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            updated: {
                                                type: 'number',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                });
                let idParameter = {
                    name: 'id',
                    in: 'path',
                    description: 'id of ' + key,
                    required: true,
                    schema: { type: 'string' },
                };
                apiPath.post = secure(meta.options.allowApiInsert, false, {
                    //"summary": "insert a " + key,
                    //"description": "insert a " + key,
                    produces: ['application/json'],
                    ...itemInBody,
                    responses: {
                        '201': {
                            description: 'Created',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/' + key,
                                    },
                                },
                            },
                        },
                        ...validationError,
                    },
                });
                apiPathWithId.get = secure(meta.options.allowApiRead, true, {
                    parameters: [idParameter],
                    responses: {
                        '200': {
                            // "description": "returns an item of " + key,
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/' + key,
                                    },
                                },
                            },
                        },
                    },
                });
                apiPathWithId.put = secure(meta.options.allowApiUpdate, false, {
                    //"summary": "Update a " + key,
                    //"description": "Update a " + key,
                    produces: ['application/json'],
                    parameters: [idParameter],
                    ...itemInBody,
                    responses: {
                        '200': {
                            description: 'successful operation',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/' + key,
                                    },
                                },
                            },
                        },
                        ...validationError,
                    },
                });
                apiPathWithId.delete = secure(meta.options.allowApiDelete, false, {
                    //      "summary": "Delete a " + key,
                    //      "description": "Delete a " + key,
                    produces: ['application/json'],
                    parameters: [idParameter],
                    responses: {
                        '204': {
                            description: 'Deleted',
                        },
                        ...validationError,
                    },
                });
            }
        }
        for (const b of this.backendMethodsOpenApi) {
            spec.paths[b.path] = {
                post: secureBase(b.allowed, false, {
                    produces: ['application/json'],
                    tags: [b.tag],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        args: {
                                            type: 'array',
                                            items: { type: 'string' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        '201': {
                            description: 'Created',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            data: {
                                                type: 'object',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        ...validationError,
                    },
                }),
            };
        }
        spec.components.schemas['InvalidResponse'] = {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                },
                modelState: {
                    type: 'object',
                },
            },
        };
        return spec;
    }
    /* internal */
    backendMethodsOpenApi = [];
}
class RequestBridgeToDataApiRequest {
    r;
    get(key) {
        return this.r?.query[key];
    }
    constructor(r) {
        this.r = r;
    }
}
class ResponseBridgeToDataApiResponse {
    r;
    req;
    genReq;
    handleError;
    forbidden(message = 'Forbidden') {
        this.error({ message }, undefined, 403);
    }
    setStatus(status) {
        return this.r.status(status);
    }
    constructor(r, req, genReq, handleError) {
        this.r = r;
        this.req = req;
        this.genReq = genReq;
        this.handleError = handleError;
    }
    progress(progress) { }
    success(data) {
        this.r.json(data);
    }
    created(data) {
        this.setStatus(201).json(data);
    }
    deleted() {
        this.setStatus(204).end();
    }
    notFound() {
        this.error({ message: 'NotFound' }, undefined, 404);
    }
    async error(exception, entity, httpStatusCode) {
        let data = serializeError(exception);
        if (!httpStatusCode) {
            if (data.httpStatusCode) {
                httpStatusCode = data.httpStatusCode;
            }
            else if (isOfType(exception, 'isForbiddenError') &&
                exception.isForbiddenError) {
                httpStatusCode = 403;
            }
            else if (data.modelState) {
                httpStatusCode = 400;
            }
            else {
                httpStatusCode = 400;
            }
        }
        let responseSent = false;
        const sendError = (httpStatusCode, body) => {
            if (responseSent) {
                throw Error('Error response already sent');
            }
            responseSent = true;
            console.error({
                message: body.message,
                httpStatusCode,
                stack: data.stack?.split('\n'),
                url: this.genReq?.url,
                method: this.genReq?.method,
            });
            const json = { ...body, message: body.message };
            this.setStatus(httpStatusCode).json(json);
        };
        await this.handleError?.({
            httpStatusCode: httpStatusCode,
            req: this.req,
            entity,
            exception,
            responseBody: data,
            sendError,
        });
        if (!responseSent) {
            sendError(httpStatusCode, data);
        }
    }
}
class inProcessQueueHandler {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    async submitJob(url, req, body) {
        let id = await this.storage.createJob(url, req.user ? req.user.id : undefined);
        let job = await this.storage.getJobInfo(id);
        this.actions.get(url)(body, req, {
            error: (error) => job.setErrorResult(serializeError(error)),
            success: (result) => job.setResult(result),
            progress: (progress) => job.setProgress(progress),
            created: () => {
                throw Error('Created response not expected for queue');
            },
            deleted: () => {
                throw Error('deleted response not expected for queue');
            },
            notFound: () => {
                throw Error('notFound response not expected for queue');
            },
            forbidden: () => job.setErrorResult('Forbidden'),
        });
        return id;
    }
    mapQueuedAction(url, what) {
        this.actions.set(url, what);
    }
    actions = new Map();
    async getJobInfo(queuedJobId) {
        return await this.storage.getJobInfo(queuedJobId);
    }
}
class InMemoryQueueStorage {
    async getJobInfo(queuedJobId) {
        return this.jobs.get(queuedJobId);
    }
    async createJob(url, userId) {
        let id = this.jobs.size.toString();
        this.jobs.set(id, {
            info: {
                done: false,
            },
            userId: userId,
            setErrorResult: (error) => {
                let job = this.jobs.get(id);
                job.info.done = true;
                job.info.error = error;
            },
            setResult: (result) => {
                let job = this.jobs.get(id);
                job.info.done = true;
                job.info.result = result;
            },
            setProgress: (progress) => {
                let job = this.jobs.get(id);
                job.info.progress = progress;
            },
        });
        return id;
    }
    jobs = new Map();
}
class RouteImplementation {
    coreOptions;
    constructor(coreOptions) {
        this.coreOptions = coreOptions;
    }
    map = new Map();
    starRoutes = [];
    route(path) {
        //consider using:
        //* https://raw.githubusercontent.com/cmorten/opine/main/src/utils/pathToRegex.ts
        //* https://github.com/pillarjs/path-to-regexp
        let r = path.toLowerCase();
        let m = new Map();
        this.map.set(r, m);
        if (path.endsWith('*'))
            this.starRoutes.push({ route: r.substring(0, r.length - 1), handler: m });
        const route = {
            get: (h) => {
                m.set('get', h);
                return route;
            },
            put: (h) => {
                m.set('put', h);
                return route;
            },
            post: (h) => {
                m.set('post', h);
                return route;
            },
            delete: (h) => {
                m.set('delete', h);
                return route;
            },
        };
        return route;
    }
    async handle(req, gRes) {
        return new Promise((res, rej) => {
            const response = new (class {
                write(data) {
                    gRes.write(data);
                }
                writeHead(statusCode, headers) {
                    gRes.writeHead(statusCode, headers);
                    this.statusCode = statusCode;
                    res({ statusCode });
                }
                flush() {
                    if (isOfType(gRes, 'flush')) {
                        gRes.flush();
                    }
                }
                statusCode = 200;
                json(data) {
                    if (gRes !== undefined)
                        gRes.json(data);
                    res({
                        statusCode: this.statusCode,
                        data,
                    });
                }
                send(html) {
                    if (gRes !== undefined)
                        gRes.send(html);
                    res({ statusCode: this.statusCode, html });
                }
                status(statusCode) {
                    if (gRes !== undefined)
                        gRes.status(statusCode);
                    this.statusCode = statusCode;
                    return this;
                }
                end() {
                    if (gRes !== undefined)
                        gRes.end();
                    res({
                        statusCode: this.statusCode,
                    });
                }
            })();
            try {
                this.middleware(req, response, () => res(undefined));
            }
            catch (err) {
                rej(err);
            }
        });
    }
    middleware(origReq, res, next) {
        const { internal: req } = this.coreOptions.buildGenericRequestInfo(origReq);
        let theUrl = req.url?.toString() || '';
        if (theUrl.startsWith('/'))
            //next sends a partial url '/api/tasks' and not the full url
            theUrl = 'http://stam' + theUrl;
        const url = new URL(theUrl);
        const path = url.pathname;
        if (!req.query) {
            let query = {};
            url.searchParams.forEach((val, key) => {
                let current = query[key];
                if (!current) {
                    query[key] = val;
                    return;
                }
                if (Array.isArray(current)) {
                    current.push(val);
                    return;
                }
                query[key] = [current, val];
            });
            origReq['_tempQuery'] = query;
            req.query = query;
        }
        let lowerPath = path.toLowerCase();
        let m = this.map.get(lowerPath);
        if (!m)
            for (const route of this.starRoutes) {
                if (lowerPath.startsWith(route.route)) {
                    m = route.handler;
                    break;
                }
            }
        if (m) {
            let h = m.get(req.method.toLowerCase());
            if (h) {
                h(origReq, res, next);
                return;
            }
        }
        let idPosition = path.lastIndexOf('/');
        if (idPosition >= 0) {
            lowerPath = lowerPath.substring(0, idPosition) + '/:id';
            m = this.map.get(lowerPath);
            if (m) {
                let h = m.get(req.method.toLowerCase());
                if (h) {
                    if (!req.params) {
                        req.params = {};
                        origReq['_tempParams'] = req.params;
                    }
                    req.params.id = decodeURIComponent(path.substring(idPosition + 1));
                    h(origReq, res, next);
                    return;
                }
            }
        }
        next();
    }
}
let JobsInQueueEntity = class JobsInQueueEntity extends IdEntity {
    userId = '';
    url = '';
    submitTime;
    doneTime;
    result = '';
    done = false;
    error = false;
    progress = 0;
};
__decorate([
    Fields.string(),
    __metadata("design:type", Object)
], JobsInQueueEntity.prototype, "userId", void 0);
__decorate([
    Fields.string(),
    __metadata("design:type", Object)
], JobsInQueueEntity.prototype, "url", void 0);
__decorate([
    Fields.date(),
    __metadata("design:type", Date)
], JobsInQueueEntity.prototype, "submitTime", void 0);
__decorate([
    Fields.date(),
    __metadata("design:type", Date)
], JobsInQueueEntity.prototype, "doneTime", void 0);
__decorate([
    Fields.string(),
    __metadata("design:type", Object)
], JobsInQueueEntity.prototype, "result", void 0);
__decorate([
    Fields.boolean(),
    __metadata("design:type", Object)
], JobsInQueueEntity.prototype, "done", void 0);
__decorate([
    Fields.boolean(),
    __metadata("design:type", Object)
], JobsInQueueEntity.prototype, "error", void 0);
__decorate([
    Fields.number(),
    __metadata("design:type", Object)
], JobsInQueueEntity.prototype, "progress", void 0);
JobsInQueueEntity = __decorate([
    Entity(undefined, {
        dbName: 'jobsInQueue',
    })
], JobsInQueueEntity);
remultStatic.allEntities.splice(remultStatic.allEntities.indexOf(JobsInQueueEntity), 1);

let init = false;
function initAsyncHooks() {
    if (init)
        return;
    init = true;
    remultStatic.asyncContext = new RemultAsyncLocalStorage(new AsyncLocalStorageBridgeToRemultAsyncLocalStorageCore());
    let test = new AsyncLocalStorage();
    test.run(1, async () => {
        await Promise.resolve();
        if (test.getStore() === undefined) {
            console.log("async_hooks.AsyncLocalStorage not working, using stub implementation (You're probably running on stackblitz, this will work on a normal nodejs environment)");
            remultStatic.asyncContext = new RemultAsyncLocalStorage(new StubRemultAsyncLocalStorageCore());
        }
    });
}
class AsyncLocalStorageBridgeToRemultAsyncLocalStorageCoreImpl {
    asyncLocalStorage = new AsyncLocalStorage();
    wasImplemented = 'yes';
    run(store, callback) {
        let r;
        this.asyncLocalStorage.run(store, () => {
            r = new Promise(async (res, rej) => {
                try {
                    res(await callback());
                }
                catch (err) {
                    rej(err);
                }
            });
        });
        return r;
    }
    getStore() {
        return this.asyncLocalStorage.getStore();
    }
}
class StubRemultAsyncLocalStorageCore {
    isStub = true;
    wasImplemented = 'yes';
    async run(store, callback) {
        this.currentValue = store;
        return await callback();
    }
    getStore() {
        return this.currentValue;
    }
    lastPromise = Promise.resolve(undefined);
    currentValue;
}
class AsyncLocalStorageBridgeToRemultAsyncLocalStorageCore extends AsyncLocalStorageBridgeToRemultAsyncLocalStorageCoreImpl {
}

let LiveQueryStorageEntity = class LiveQueryStorageEntity extends EntityBase {
    id = '';
    entityKey = '';
    data;
    lastUsedIso = new Date().toISOString();
};
__decorate([
    Fields.string(),
    __metadata("design:type", Object)
], LiveQueryStorageEntity.prototype, "id", void 0);
__decorate([
    Fields.string(),
    __metadata("design:type", Object)
], LiveQueryStorageEntity.prototype, "entityKey", void 0);
__decorate([
    Fields.object(),
    __metadata("design:type", Object)
], LiveQueryStorageEntity.prototype, "data", void 0);
__decorate([
    Fields.string(),
    __metadata("design:type", Object)
], LiveQueryStorageEntity.prototype, "lastUsedIso", void 0);
LiveQueryStorageEntity = __decorate([
    Entity(undefined, {
        dbName: 'remult_live_query_storage',
    })
    /*@internal */
], LiveQueryStorageEntity);

function createRemultServer(options, serverCoreOptions) {
    initAsyncHooks();
    return createRemultServerCore(options, serverCoreOptions || {
        buildGenericRequestInfo: (req) => ({
            internal: cast(req, 'method'),
            public: { headers: new Headers(req.headers) },
        }),
        getRequestBody: async (req) => req.body,
    });
}

function remultApi(options) {
    let result = createRemultServer(options, {
        buildGenericRequestInfo: (event) => ({
            internal: {
                url: event.request.url,
                method: event.request.method,
                on: (e, do1) => {
                    if (e === 'close') {
                        event.locals['_tempOnClose'] = do1;
                    }
                },
            },
            public: { headers: event.request.headers },
        }),
        getRequestBody: (event) => event.request.json(),
    });
    const serverHandler = async (event) => {
        let sseResponse = undefined;
        event.locals['_tempOnClose'] = () => { };
        const response = {
            end: () => { },
            json: () => { },
            send: () => { },
            status: () => {
                return response;
            },
            write: () => { },
            writeHead: (status, headers) => {
                if (status === 200 && headers) {
                    const contentType = headers['Content-Type'];
                    if (contentType === 'text/event-stream') {
                        const messages = [];
                        response.write = (x) => messages.push(x);
                        const stream = new ReadableStream({
                            start: (controller) => {
                                for (const message of messages) {
                                    controller.enqueue(message);
                                }
                                response.write = (data) => {
                                    controller.enqueue(data);
                                };
                            },
                            cancel: () => {
                                response.write = () => { };
                                event.locals['_tempOnClose']();
                            },
                        });
                        sseResponse = new Response(stream, { headers });
                    }
                }
            },
        };
        const responseFromRemultHandler = await result.handle(event, response);
        if (sseResponse !== undefined) {
            return sseResponse;
        }
        if (responseFromRemultHandler !== undefined) {
            if (responseFromRemultHandler.html)
                return new Response(responseFromRemultHandler.html, {
                    status: responseFromRemultHandler.statusCode,
                    headers: {
                        'Content-Type': 'text/html',
                    },
                });
            const res = new Response(JSON.stringify(responseFromRemultHandler.data), {
                status: responseFromRemultHandler.statusCode,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return res;
        }
        return new Response('Not Found', {
            status: 404,
        });
    };
    const handler = async ({ event, resolve }) => {
        return result.withRemultAsync(event, async () => await resolve(event));
    };
    result.getRouteImpl();
    return Object.assign(handler, {
        getRemult: (req) => result.getRemult(req),
        openApiDoc: (options) => result.openApiDoc(options),
        withRemult(request, what) {
            return result.withRemultAsync(request, what);
        },
        hookHandler: handler,
        GET: serverHandler,
        PUT: serverHandler,
        POST: serverHandler,
        DELETE: serverHandler,
    });
}

class SqliteCoreDataProvider {
    createCommand;
    end;
    doesNotSupportReturningSyntax;
    doesNotSupportReturningSyntaxOnlyForUpdate;
    constructor(createCommand, end, doesNotSupportReturningSyntax = false, doesNotSupportReturningSyntaxOnlyForUpdate = false) {
        this.createCommand = createCommand;
        this.end = end;
        this.doesNotSupportReturningSyntax = doesNotSupportReturningSyntax;
        this.doesNotSupportReturningSyntaxOnlyForUpdate = doesNotSupportReturningSyntaxOnlyForUpdate;
    }
    orderByNullsFirst;
    getLimitSqlSyntax(limit, offset) {
        return ' limit ' + limit + ' offset ' + offset;
    }
    afterMutation;
    provideMigrationBuilder(builder) {
        let self = this;
        return {
            createTable: async (entity) => {
                await (await self.getCreateTableSql(entity)).map(builder.addSql);
            },
            addColumn: async (entity, field) => {
                let e = await dbNamesOf(entity, this.wrapIdentifier);
                let sql = `alter table ${e.$entityName} add column ${self.addColumnSqlSyntax(field, e.$dbNameOf(field), true)}`;
                builder.addSql(sql);
            },
        };
    }
    async transaction(action) {
        await this.createCommand().execute('Begin Transaction');
        try {
            await action(this);
            await this.createCommand().execute('Commit');
        }
        catch (err) {
            await this.createCommand().execute('Rollback');
            throw err;
        }
    }
    async entityIsUsedForTheFirstTime(entity) { }
    async ensureSchema(entities) {
        for (const entity of entities) {
            await this.createTableIfNotExist(entity);
            await this.verifyAllColumns(entity);
        }
    }
    async verifyAllColumns(entity) {
        try {
            let cmd = this.createCommand();
            let e = await dbNamesOf(entity, this.wrapIdentifier);
            let cols = (await cmd.execute(`PRAGMA table_info(${e.$entityName})`)).rows.map((x) => this.wrapIdentifier(x.name.toLocaleLowerCase()));
            for (const col of entity.fields) {
                if (!shouldNotCreateField(col, e)) {
                    let colName = e.$dbNameOf(col).toLocaleLowerCase();
                    if (!cols.includes(colName)) {
                        let sql = `ALTER table ${e.$entityName} ` +
                            `add column ${this.addColumnSqlSyntax(col, e.$dbNameOf(col), true)}`;
                        await this.createCommand().execute(sql);
                    }
                }
            }
        }
        catch (err) {
            console.error(err);
        }
    }
    async dropTable(entity) {
        let e = await dbNamesOf(entity, this.wrapIdentifier);
        let sql = 'drop  table if exists ' + e.$entityName;
        if (SqlDatabase.LogToConsole)
            console.info(sql);
        await this.createCommand().execute(sql);
    }
    addColumnSqlSyntax(x, dbName, isAlterTable) {
        let result = dbName;
        const nullNumber = x.allowNull ? '' : ' default 0 not null';
        if (x.valueConverter.fieldTypeInDb)
            result += ' ' + x.valueConverter.fieldTypeInDb + ' ' + nullNumber;
        else if (x.valueType == Date)
            result += ' integer';
        else if (x.valueType == Boolean)
            result += ' integer ' + nullNumber;
        else if (x.valueType == Number) {
            if (!x.valueConverter.fieldTypeInDb)
                result += ' numeric ' + nullNumber;
            else
                result += ' ' + x.valueConverter.fieldTypeInDb + ' ' + nullNumber;
        }
        else
            result += ' text' + (x.allowNull ? ' ' : " default '' not null ");
        return result;
    }
    async createTableIfNotExist(entity) {
        let sql = await this.getCreateTableSql(entity);
        for (const element of sql) {
            await this.createCommand().execute(element);
        }
    }
    supportsJsonColumnType;
    async getCreateTableSql(entity) {
        let result = '';
        let e = await dbNamesOf(entity, this.wrapIdentifier);
        for (const x of entity.fields) {
            if (!shouldNotCreateField(x, e) || isAutoIncrement(x)) {
                if (result.length != 0)
                    result += ',';
                result += '\r\n  ';
                if (isAutoIncrement(x)) {
                    if (x.key != entity.idMetadata.field.key)
                        throw 'in sqlite, autoincrement is only allowed for primary key';
                    result += e.$dbNameOf(x) + ' integer primary key autoincrement';
                }
                else {
                    result += this.addColumnSqlSyntax(x, e.$dbNameOf(x), false);
                    if (x.key == entity.idMetadata.field.key) {
                        result += ' primary key';
                    }
                }
            }
        }
        let sql = [
            'create table if not exists ' + e.$entityName + ' (' + result + '\r\n)',
        ];
        if (entity.idMetadata.fields.length > 1) {
            sql.push(`create unique index if not exists ${this.wrapIdentifier(entity.dbName + '_primary_key')} on ${e.$entityName}  (${entity.idMetadata.fields
                .map((x) => e.$dbNameOf(x))
                .join(',')})`);
        }
        return sql;
    }
    wrapIdentifier(name) {
        //return name
        return '`' + name + '`';
    }
}

class BetterSqlite3DataProvider extends SqliteCoreDataProvider {
    constructor(db) {
        super(() => new BetterSqlite3Command(db), async () => { db.close(); });
    }
}
class BetterSqlite3Command {
    db;
    values = {};
    i = 0;
    constructor(db) {
        this.db = db;
    }
    async execute(sql) {
        const s = this.db.prepare(sql);
        if (s.reader) {
            return new BetterSqlite3SqlResult(s.all(this.values));
        }
        else {
            s.run(this.values);
            return new BetterSqlite3SqlResult([]);
        }
    }
    addParameterAndReturnSqlToken(val) {
        return this.param(val);
    }
    param(val) {
        if (val instanceof Date)
            val = val.valueOf();
        if (typeof val === "boolean")
            val = val ? 1 : 0;
        const key = ':' + (this.i++);
        this.values[key.substring(1)] = (val);
        return key;
    }
}
class BetterSqlite3SqlResult {
    result;
    constructor(result) {
        this.result = result;
        this.rows = result;
    }
    rows;
    getColumnKeyInResultForIndexInSelect(index) {
        return Object.keys(this.result[0])[index];
    }
}

//#region src/lib/server/api.ts
var db = new Database("./db.sqlite");
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.exec(`
	CREATE INDEX IF NOT EXISTS idx_chatMessages_sessionId ON chatMessages(sessionId);
	CREATE INDEX IF NOT EXISTS idx_chatMessages_sortOrder ON chatMessages(sortOrder);
	CREATE INDEX IF NOT EXISTS idx_activeStreams_sessionId ON activeStreams(sessionId);
`);
try {
	db.exec(`ALTER TABLE providerSettings ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1`);
} catch {}
var dataProvider = new SqlDatabase(new BetterSqlite3DataProvider(db));
var api = remultApi({
	entities: [
		ActiveStream,
		ChatMessage,
		ProviderSetting,
		ChatSessionSettings
	],
	controllers: [AgentService],
	dataProvider,
	admin: true
});
globalThis.remultApi = api;

export { api as a };
//# sourceMappingURL=api-C0FHZkdj.js.map
