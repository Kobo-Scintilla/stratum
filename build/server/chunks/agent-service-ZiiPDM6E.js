import { C as ChatMessage, _ as __decorate } from './chat-message-CwAUUCQ1.js';
import { C as ChatSessionSettings, P as ProviderSetting, A as ActiveStream } from './chat-session-settings-C_T3OJ8l.js';
import { r as remult, p as isOfType, V as ValueConverters, H as customDatabaseFilterToken, M as getRepository, N as getRepositoryInternals, S as Sort, O as originalSqlExpressionKey, F as Filter, y as isAutoIncrement, J as GroupByOperators, G as GroupByCountMember, P as getEntityMetadata, Q as entityDbName, T as fieldDbName, U as buildRestDataProvider, j as remultStatic, W as checkTarget, s as serverActionField, X as ClassHelper, Y as isBackend, k as Remult, Z as decorateColumnSettings, D as getEntitySettings, $ as getEntityRef, a0 as getControllerRef, d as doTransaction } from './IdEntity-Le34BexZ.js';
import { getModel, streamSimple, Type } from '@earendil-works/pi-ai';

/**
 * A DataProvider for Sql Databases
 * @example
 * const db = new SqlDatabase(new PostgresDataProvider(pgPool))
* @see [Connecting a Database](https://remult.dev/docs/quickstart#connecting-a-database)

 */
class SqlDatabase {
    sql;
    /**
     * Gets the SQL database from the data provider.
     * @param dataProvider - The data provider.
     * @returns The SQL database.
     * @see [Direct Database Access](https://remult.dev/docs/running-sql-on-the-server)
     */
    static getDb(dataProvider) {
        const r = (dataProvider || remult.dataProvider);
        if (isOfType(r, 'createCommand'))
            return r;
        else
            throw 'the data provider is not an SqlCommandFactory';
    }
    /**
     * Creates a new SQL command.
     * @returns The SQL command.
     * @see [Direct Database Access](https://remult.dev/docs/running-sql-on-the-server)
     */
    createCommand() {
        return new LogSQLCommand(this.sql.createCommand(), SqlDatabase.LogToConsole);
    }
    /**
     * Executes a SQL command.
     * @param sql - The SQL command.
     * @returns The SQL result.
     * @see [Direct Database Access](https://remult.dev/docs/running-sql-on-the-server)
     */
    async execute(sql) {
        return await this.createCommand().execute(sql);
    }
    /**
     * Wraps an identifier with the database's identifier syntax.
     */
    wrapIdentifier = (x) => x;
    /* @internal*/
    _getSourceSql() {
        return this.sql;
    }
    async ensureSchema(entities) {
        if (this.sql.ensureSchema)
            await this.sql.ensureSchema(entities);
    }
    /**
     * Gets the entity data provider.
     * @param entity  - The entity metadata.
     * @returns The entity data provider.
     */
    getEntityDataProvider(entity) {
        if (!this.sql.supportsJsonColumnType) {
            for (const f of entity.fields.toArray()) {
                if (f.valueConverter.fieldTypeInDb === 'json') {
                    //@ts-ignore
                    f.valueConverter = {
                        ...f.valueConverter,
                        toDb: ValueConverters.JsonString.toDb,
                        fromDb: ValueConverters.JsonString.fromDb,
                    };
                }
            }
        }
        return new ActualSQLEntityDataProvider(entity, this, async (dbName) => {
            if (this.createdEntities.indexOf(dbName.$entityName) < 0) {
                this.createdEntities.push(dbName.$entityName);
                await this.sql.entityIsUsedForTheFirstTime(entity);
            }
        }, this.sql);
    }
    /**
     * Runs a transaction. Used internally by remult when transactions are required
     * @param action - The action to run in the transaction.
     * @returns The promise of the transaction.
     */
    transaction(action) {
        return this.sql.transaction(async (x) => {
            let completed = false;
            try {
                await action(new SqlDatabase({
                    createCommand: () => {
                        let c = x.createCommand();
                        return {
                            addParameterAndReturnSqlToken: (val) => {
                                return c.param(val);
                            },
                            param: (x) => c.param(x),
                            execute: async (sql) => {
                                if (completed)
                                    throw "can't run a command after the transaction was completed";
                                return c.execute(sql);
                            },
                        };
                    },
                    getLimitSqlSyntax: this.sql.getLimitSqlSyntax,
                    entityIsUsedForTheFirstTime: (y) => x.entityIsUsedForTheFirstTime(y),
                    transaction: (z) => x.transaction(z),
                    supportsJsonColumnType: this.sql.supportsJsonColumnType,
                    wrapIdentifier: this.wrapIdentifier,
                    end: this.end,
                    doesNotSupportReturningSyntax: this.sql.doesNotSupportReturningSyntax,
                    doesNotSupportReturningSyntaxOnlyForUpdate: this.sql.doesNotSupportReturningSyntaxOnlyForUpdate,
                    orderByNullsFirst: this.sql.orderByNullsFirst,
                }));
            }
            finally {
                completed = true;
            }
        });
    }
    /**
     * Creates a raw filter for entity filtering.
     * @param {CustomSqlFilterBuilderFunction} build - The custom SQL filter builder function.
     * @returns {EntityFilter<any>} - The entity filter with a custom SQL filter.
     * @example
     * SqlDatabase.rawFilter(({param}) =>
          `"customerId" in (select id from customers where city = ${param(customerCity)})`
        )
     * @see [Leveraging Database Capabilities with Raw SQL in Custom Filters](https://remult.dev/docs/custom-filter.html#leveraging-database-capabilities-with-raw-sql-in-custom-filters)
     */
    static rawFilter(build) {
        return {
            [customDatabaseFilterToken]: {
                buildSql: build,
            },
        };
    }
    /**
     *  Converts a filter to a raw SQL string.
     *  @see [Leveraging Database Capabilities with Raw SQL in Custom Filters](https://remult.dev/docs/running-sql-on-the-server#leveraging-entityfilter-for-sql-databases)
     
     */
    static async filterToRaw(repo, condition, sqlCommand, dbNames, wrapIdentifier) {
        if (!sqlCommand) {
            sqlCommand = new myDummySQLCommand();
        }
        const r = getRepository(repo);
        var b = new FilterConsumerBridgeToSqlRequest(sqlCommand, dbNames ||
            (await dbNamesOfWithForceSqlExpression(r.metadata, wrapIdentifier)));
        b._addWhere = false;
        await (await getRepositoryInternals(r)._translateWhereToFilter(condition)).__applyToConsumer(b);
        return await b.resolveWhere();
    }
    /**
     * `false` _(default)_ - No logging
     *
     * `true` - to log all queries to the console
     *
     * `oneLiner` - to log all queries to the console as one line
     *
     * a `function` - to log all queries to the console as a custom format
     * @example
     * SqlDatabase.LogToConsole = (duration, query, args) => { console.log("be crazy ;)") }
     */
    static LogToConsole = false;
    /**
     * Threshold in milliseconds for logging queries to the console.
     */
    static durationThreshold = 0;
    /**
     * Creates a new SQL database.
     * @param sql - The SQL implementation.
     * @example
     * const db = new SqlDatabase(new PostgresDataProvider(pgPool))
     */
    constructor(sql) {
        this.sql = sql;
        if (sql.wrapIdentifier)
            this.wrapIdentifier = (x) => sql.wrapIdentifier(x);
        if (isOfType(sql, 'provideMigrationBuilder')) {
            this.provideMigrationBuilder = (x) => sql.provideMigrationBuilder(x);
        }
        if (isOfType(sql, 'end'))
            this.end = () => sql.end();
    }
    provideMigrationBuilder;
    createdEntities = [];
    end;
}
const icons = new Map([
    // CRUD
    ['INSERT', '⚪'], // Used to insert new data into a database.
    ['SELECT', '🔵'], // Used to select data from a database and retrieve it.
    ['UPDATE', '🟣'], // Used to update existing data within a database.
    ['DELETE', '🟤'], // Used to delete existing data from a database.
    // Additional
    ['CREATE', '🟩'], // Used to create a new table, or database.
    ['ALTER', '🟨'], // Used to modify an existing database object, such as a table.
    ['DROP', '🟥'], // Used to delete an entire table or database.
    ['TRUNCATE', '⬛'], // Used to remove all records from a table, including all spaces allocated for the records are removed.
    ['GRANT', '🟪'], // Used to give a specific user permission to perform certain tasks.
    ['REVOKE', '🟫'], // Used to take back permissions from a user.
]);
class LogSQLCommand {
    origin;
    logToConsole;
    constructor(origin, logToConsole) {
        this.origin = origin;
        this.logToConsole = logToConsole;
    }
    args = {};
    addParameterAndReturnSqlToken(val) {
        return this.param(val);
    }
    param(val, name) {
        let r = this.origin.param(val);
        this.args[r] = val;
        return r;
    }
    async execute(sql) {
        try {
            let start = new Date();
            let r = await this.origin.execute(sql);
            if (this.logToConsole !== false) {
                var d = new Date().valueOf() - start.valueOf();
                if (d >= SqlDatabase.durationThreshold) {
                    const duration = d / 1000;
                    if (this.logToConsole === 'oneLiner') {
                        const rawSql = sql
                            .replace(/(\r\n|\n|\r|\t)/gm, ' ')
                            .replace(/  +/g, ' ')
                            .trim();
                        const first = rawSql.split(' ')[0].toUpperCase();
                        console.info(`${icons.get(first) || '💢'} (${duration.toFixed(3)}) ${rawSql} ${JSON.stringify(this.args)}`);
                    }
                    else if (typeof this.logToConsole === 'function') {
                        this.logToConsole(duration, sql, this.args);
                    }
                    else {
                        console.info(sql + '\n', { arguments: this.args, duration });
                    }
                }
            }
            return r;
        }
        catch (err) {
            console.error((err.message || 'Sql Error') + ':\n', sql, {
                arguments: this.args,
                error: err,
            });
            throw err;
        }
    }
}
class ActualSQLEntityDataProvider {
    entity;
    sql;
    iAmUsed;
    strategy;
    static LogToConsole = false;
    constructor(entity, sql, iAmUsed, strategy) {
        this.entity = entity;
        this.sql = sql;
        this.iAmUsed = iAmUsed;
        this.strategy = strategy;
    }
    async init() {
        let dbNameProvider = await dbNamesOfWithForceSqlExpression(this.entity, (x) => this.sql.wrapIdentifier(x));
        await this.iAmUsed(dbNameProvider);
        return dbNameProvider;
    }
    async count(where) {
        let e = await this.init();
        let select = 'select count(*) count from ' + e.$entityName;
        let r = this.sql.createCommand();
        if (where) {
            let wc = new FilterConsumerBridgeToSqlRequest(r, e);
            where.__applyToConsumer(wc);
            select += await wc.resolveWhere();
        }
        return r.execute(select).then((r) => {
            return Number(r.rows[0].count);
        });
    }
    async groupBy(options) {
        return await groupByImpl(options, await this.init(), this.sql.createCommand(), this.sql._getSourceSql().orderByNullsFirst, this.sql._getSourceSql().getLimitSqlSyntax);
    }
    async find(options) {
        let e = await this.init();
        let r = this.sql.createCommand();
        let { colKeys, select } = await this.buildSelect(e, r, options?.select, options?.args);
        select = 'select ' + select;
        select += '\n from ' + e.$entityName;
        if (options) {
            if (options.where) {
                let where = new FilterConsumerBridgeToSqlRequest(r, e);
                options.where.__applyToConsumer(where);
                select += await where.resolveWhere();
            }
            if (options.limit) {
                options.orderBy = Sort.createUniqueSort(this.entity, options.orderBy);
            }
            if (!options.orderBy) {
                options.orderBy = Sort.createUniqueSort(this.entity, new Sort());
            }
            if (options.orderBy) {
                let first = true;
                let segs = [];
                for (const s of options.orderBy.Segments) {
                    segs.push(s);
                }
                for (const c of segs) {
                    if (first) {
                        select += ' Order By ';
                        first = false;
                    }
                    else
                        select += ', ';
                    select += c.field.options.sqlExpression
                        ? c.field.options.key
                        : await e.$dbNameOf(c.field);
                    if (c.isDescending)
                        select += ' desc';
                    if (this.sql._getSourceSql().orderByNullsFirst) {
                        if (c.isDescending)
                            select += ' nulls last';
                        else
                            select += ' nulls first';
                    }
                }
            }
            if (options.limit) {
                let page = 1;
                if (options.page)
                    page = options.page;
                if (page < 1)
                    page = 1;
                select +=
                    ' ' +
                        this.strategy.getLimitSqlSyntax(options.limit, (page - 1) * options.limit);
            }
        }
        return r.execute(select).then((r) => {
            return r.rows.map((y) => {
                return this.buildResultRow(colKeys, y, r);
            });
        });
    }
    buildResultRow(colKeys, y, r) {
        let result = {};
        for (let index = 0; index < colKeys.length; index++) {
            const col = colKeys[index];
            try {
                result[col.key] = col.valueConverter.fromDb(y[r.getColumnKeyInResultForIndexInSelect(index)]);
            }
            catch (err) {
                throw new Error('Failed to load from db:' + col.key + '\r\n' + err);
            }
        }
        return result;
    }
    async buildSelect(e, r, selectedFields, args) {
        let select = '';
        let colKeys = [];
        for (const x of this.entity.fields) {
            if (selectedFields && !selectedFields.includes(x.key))
                continue;
            if (x.isServerExpression) ;
            else {
                if (colKeys.length > 0)
                    select += ', ';
                if (typeof x.options.sqlExpression === 'function') {
                    let sql = await x[originalSqlExpressionKey](this.entity, args, r);
                    if (sql.includes(' '))
                        select += '(' + sql + ')';
                    else
                        select += sql;
                }
                else
                    select += e.$dbNameOf(x);
                if (x.options.sqlExpression)
                    select += ' as ' + x.key;
                colKeys.push(x);
            }
        }
        return { colKeys, select };
    }
    async update(id, data, options) {
        let e = await this.init();
        let r = this.sql.createCommand();
        let statement = 'update ' + e.$entityName + ' set ';
        let added = false;
        for (const x of this.entity.fields) {
            if (isDbReadonly(x, e)) ;
            else if (data[x.key] !== undefined) {
                let v = x.valueConverter.toDb(data[x.key]);
                if (v !== undefined) {
                    if (!added)
                        added = true;
                    else
                        statement += ', ';
                    statement += e.$dbNameOf(x) + ' = ' + toDbSql(r, x, v);
                }
            }
        }
        const idFilter = this.entity.idMetadata.getIdFilter(id);
        let f = new FilterConsumerBridgeToSqlRequest(r, e);
        Filter.fromEntityFilter(this.entity, idFilter).__applyToConsumer(f);
        statement += await f.resolveWhere();
        let { colKeys, select } = await this.buildSelect(e, r, undefined, undefined);
        let returning = true;
        if (this.sql._getSourceSql().doesNotSupportReturningSyntax)
            returning = false;
        if (options?.select === 'none')
            returning = false;
        if (returning &&
            this.sql._getSourceSql().doesNotSupportReturningSyntaxOnlyForUpdate)
            returning = false;
        if (returning)
            statement += ' returning ' + select;
        return r.execute(statement).then((sqlResult) => {
            this.sql._getSourceSql().afterMutation?.();
            if (!returning) {
                if (options?.select === 'none')
                    return undefined;
                return getRowAfterUpdate(this.entity, this, data, id, 'update');
            }
            if (sqlResult.rows.length != 1)
                throw new Error('Failed to update row with id ' +
                    id +
                    ', rows updated: ' +
                    sqlResult.rows.length);
            return this.buildResultRow(colKeys, sqlResult.rows[0], sqlResult);
        });
    }
    async delete(id) {
        let e = await this.init();
        let r = this.sql.createCommand();
        let f = new FilterConsumerBridgeToSqlRequest(r, e);
        Filter.fromEntityFilter(this.entity, this.entity.idMetadata.getIdFilter(id)).__applyToConsumer(f);
        let statement = 'delete from ' + e.$entityName;
        statement += await f.resolveWhere();
        return r.execute(statement).then(() => {
            this.sql._getSourceSql().afterMutation?.();
        });
    }
    async insert(data, options) {
        let e = await this.init();
        let r = this.sql.createCommand();
        let cols = '';
        let vals = '';
        let added = false;
        for (const x of this.entity.fields) {
            if (isDbReadonly(x, e)) ;
            else {
                let v = x.valueConverter.toDb(data[x.key]);
                if (v != undefined) {
                    if (!added)
                        added = true;
                    else {
                        cols += ', ';
                        vals += ', ';
                    }
                    cols += e.$dbNameOf(x);
                    vals += toDbSql(r, x, v);
                }
            }
        }
        let statement = `insert into ${e.$entityName} (${cols}) values (${vals})`;
        let { colKeys, select } = await this.buildSelect(e, r, undefined, undefined);
        if (!this.sql._getSourceSql().doesNotSupportReturningSyntax &&
            !(options?.select === 'none'))
            statement += ' returning ' + select;
        return await r.execute(statement).then((sql) => {
            this.sql._getSourceSql().afterMutation?.();
            if (this.sql._getSourceSql().doesNotSupportReturningSyntax) {
                if (isAutoIncrement(this.entity.idMetadata.field)) {
                    const id = sql.rows[0];
                    if (typeof id !== 'number')
                        throw new Error('Auto increment, for a database that is does not support returning syntax, should return an array with the single last added id. Instead it returned: ' +
                            JSON.stringify(id));
                    if (options?.select === 'none')
                        return undefined;
                    return this.find({
                        where: new Filter((x) => x.isEqualTo(this.entity.idMetadata.field, id)),
                    }).then((r) => r[0]);
                }
                else {
                    if (options?.select === 'none')
                        return undefined;
                    return getRowAfterUpdate(this.entity, this, data, undefined, 'insert');
                }
            }
            if (options?.select === 'none')
                return undefined;
            return this.buildResultRow(colKeys, sql.rows[0], sql);
        });
    }
}
class myDummySQLCommand {
    execute(sql) {
        throw new Error('Method not implemented.');
    }
    addParameterAndReturnSqlToken(val) {
        return this.param(val);
    }
    param(val) {
        if (val === null)
            return 'null';
        if (val instanceof Date)
            val = val.toISOString();
        if (typeof val == 'string') {
            if (val == undefined)
                val = '';
            return "'" + val.replace(/'/g, "''") + "'";
        }
        return val.toString();
    }
}
function getRowAfterUpdate(meta, dataProvider, data, id, operation) {
    const idFilter = id !== undefined ? meta.idMetadata.getIdFilter(id) : {};
    return dataProvider
        .find({
        where: new Filter((x) => {
            for (const field of meta.idMetadata.fields) {
                x.isEqualTo(field, data[field.key] ?? idFilter[field.key]);
            }
        }),
    })
        .then((r) => {
        if (r.length != 1)
            throw new Error(`Failed to ${operation} row - result contained ${r.length} rows`);
        return r[0];
    });
}
async function groupByImpl(options, e, r, orderByNullFirst, limitSyntax) {
    let select = 'select count(*) as count';
    let groupBy = '';
    const processResultRow = [];
    processResultRow.push((sqlVal, theResult) => {
        theResult[GroupByCountMember] = Number(sqlVal);
    });
    if (options?.group)
        for (const x of options?.group) {
            if (x.isServerExpression) ;
            else {
                select += ', ' + e.$dbNameOf(x);
                if (x.options.sqlExpression)
                    select += ' as ' + x.key;
                if (groupBy == '')
                    groupBy = ' group by ';
                else
                    groupBy += ', ';
                groupBy += e.$dbNameOf(x);
            }
            processResultRow.push((sqlResult, theResult) => {
                theResult[x.key] = x.valueConverter.fromDb(sqlResult);
            });
        }
    for (const operator of GroupByOperators) {
        const fields = options?.[operator];
        if (fields)
            for (const x of fields) {
                if (x.isServerExpression) ;
                else {
                    const dbName = await e.$dbNameOf(x);
                    select += `, ${aggregateSqlSyntax(operator, dbName)} as ${x.key}_${operator}`;
                }
                const turnToNumber = x.valueType === Number || operator == 'distinctCount';
                processResultRow.push((sqlResult, theResult) => {
                    if (turnToNumber)
                        sqlResult = Number(sqlResult);
                    if (operator === 'max' || operator === 'min')
                        sqlResult = x.valueConverter.fromDb(sqlResult);
                    theResult[x.key] = { ...theResult[x.key], [operator]: sqlResult };
                });
            }
    }
    select += '\n from ' + e.$entityName;
    if (options?.where) {
        let where = new FilterConsumerBridgeToSqlRequest(r, e);
        options?.where.__applyToConsumer(where);
        select += await where.resolveWhere();
    }
    if (groupBy)
        select += groupBy;
    let orderBy = '';
    if (options?.orderBy) {
        for (const x of options?.orderBy) {
            if (orderBy == '')
                orderBy = ' order by ';
            else
                orderBy += ', ';
            let field = x.field && (await e.$dbNameOf(x.field));
            switch (x.operation) {
                case 'count':
                    field = x.operation + '(*)';
                    break;
                case undefined:
                    break;
                default:
                    field = aggregateSqlSyntax(x.operation, field);
            }
            orderBy += field;
            if (x.isDescending)
                orderBy += ' desc';
            if (orderByNullFirst) {
                if (x.isDescending)
                    orderBy += ' nulls last';
                else
                    orderBy += ' nulls first';
            }
        }
        if (orderBy)
            select += orderBy;
    }
    if (options?.limit) {
        let page = 1;
        if (options.page)
            page = options.page;
        if (page < 1)
            page = 1;
        select += ' ' + limitSyntax(options.limit, (page - 1) * options.limit);
    }
    const result = await r.execute(select);
    return result.rows.map((sql) => {
        let theResult = {};
        processResultRow.forEach((x, i) => x(sql[result.getColumnKeyInResultForIndexInSelect(i)], theResult));
        return theResult;
    });
    function aggregateSqlSyntax(operator, dbName) {
        return operator === 'distinctCount'
            ? `count (distinct ${dbName})`
            : `${operator}( ${dbName} )`;
    }
}

class FilterConsumerBridgeToSqlRequest {
    r;
    nameProvider;
    where = '';
    _addWhere = true;
    promises = [];
    async resolveWhere() {
        while (this.promises.length > 0) {
            let p = this.promises;
            this.promises = [];
            for (const pr of p) {
                await pr;
            }
        }
        return this.where;
    }
    constructor(r, nameProvider) {
        this.r = r;
        this.nameProvider = nameProvider;
    }
    custom(key, customItem) {
        throw new Error('Custom filter should be translated before it gets here');
    }
    or(orElements) {
        let statement = '';
        this.promises.push((async () => {
            for (const element of orElements) {
                let f = new FilterConsumerBridgeToSqlRequest(this.r, this.nameProvider);
                f._addWhere = false;
                element.__applyToConsumer(f);
                let where = await f.resolveWhere();
                if (!where)
                    return; //since if any member of or is empty, then the entire or is irrelevant
                if (where.length > 0) {
                    if (statement.length > 0) {
                        statement += ' or ';
                    }
                    if (orElements.length > 1) {
                        statement += '(' + where + ')';
                    }
                    else
                        statement += where;
                }
            }
            this.addToWhere('(' + statement + ')');
        })());
    }
    not(element) {
        this.promises.push((async () => {
            let f = new FilterConsumerBridgeToSqlRequest(this.r, this.nameProvider);
            f._addWhere = false;
            element.__applyToConsumer(f);
            let where = await f.resolveWhere();
            if (!where)
                return; //since if any member of or is empty, then the entire or is irrelevant
            this.addToWhere('not (' + where + ')');
        })());
    }
    isNull(col) {
        this.promises.push((async () => this.addToWhere(this.nameProvider.$dbNameOf(col) + ' is null'))());
    }
    isNotNull(col) {
        this.promises.push((async () => this.addToWhere(this.nameProvider.$dbNameOf(col) + ' is not null'))());
    }
    isIn(col, val) {
        this.promises.push((async () => {
            if (val && val.length > 0)
                this.addToWhere(this.nameProvider.$dbNameOf(col) +
                    ' in (' +
                    val
                        .map((x) => toDbSql(this.r, col, col.valueConverter.toDb(x)))
                        .join(',') +
                    ')');
            else
                this.addToWhere('1 = 0 /*isIn with no values*/');
        })());
    }
    isEqualTo(col, val) {
        this.add(col, val, '=');
    }
    isDifferentFrom(col, val) {
        this.add(col, val, '<>');
    }
    isGreaterOrEqualTo(col, val) {
        this.add(col, val, '>=');
    }
    isGreaterThan(col, val) {
        this.add(col, val, '>');
    }
    isLessOrEqualTo(col, val) {
        this.add(col, val, '<=');
    }
    isLessThan(col, val) {
        this.add(col, val, '<');
    }
    containsCaseInsensitive(col, val) {
        this.promises.push((async () => {
            this.addToWhere('lower (' +
                this.nameProvider.$dbNameOf(col) +
                ") like lower ('%" +
                val.replace(/'/g, "''") +
                "%')");
        })());
    }
    notContainsCaseInsensitive(col, val) {
        this.promises.push((async () => {
            this.addToWhere('not lower (' +
                this.nameProvider.$dbNameOf(col) +
                ") like lower ('%" +
                val.replace(/'/g, "''") +
                "%')");
        })());
    }
    startsWithCaseInsensitive(col, val) {
        this.promises.push((async () => {
            this.addToWhere('lower (' +
                this.nameProvider.$dbNameOf(col) +
                ") like lower ('" +
                val.replace(/'/g, "''") +
                "%')");
        })());
    }
    endsWithCaseInsensitive(col, val) {
        this.promises.push((async () => {
            this.addToWhere('lower (' +
                this.nameProvider.$dbNameOf(col) +
                ") like lower ('%" +
                val.replace(/'/g, "''") +
                "')");
        })());
    }
    add(col, val, operator) {
        this.promises.push((async () => {
            let x = this.nameProvider.$dbNameOf(col) +
                ' ' +
                operator +
                ' ' +
                toDbSql(this.r, col, col.valueConverter.toDb(val));
            this.addToWhere(x);
        })());
    }
    addToWhere(x) {
        if (this.where.length == 0) {
            if (this._addWhere)
                this.where += ' where ';
        }
        else
            this.where += ' and ';
        this.where += x;
    }
    databaseCustom(databaseCustom) {
        this.promises.push((async () => {
            if (databaseCustom?.buildSql) {
                let item = new CustomSqlFilterBuilder(this.r, this.nameProvider.wrapIdentifier);
                let sql = await databaseCustom.buildSql(item);
                if (typeof sql !== 'string')
                    sql = item.sql;
                if (sql) {
                    this.addToWhere('(' + sql + ')');
                }
            }
        })());
    }
}
/**
 * Represents a custom SQL filter builder.
 */
class CustomSqlFilterBuilder {
    r;
    wrapIdentifier;
    constructor(r, wrapIdentifier) {
        this.r = r;
        this.wrapIdentifier = wrapIdentifier;
        this.param.bind(this);
        this.filterToRaw.bind(this);
    }
    sql = '';
    /** @deprecated  use `param` instead*/
    addParameterAndReturnSqlToken(val) {
        return this.param(val);
    }
    /**
     * Adds a parameter value.
     * @param {valueType} val - The value to add as a parameter.
     * @param {FieldMetadata<valueType>} [field] - The field metadata.
     * @returns {string} - The SQL token.
     */
    param = (val, field) => {
        if (typeof field === 'object' && field.valueConverter.toDb) {
            val = field.valueConverter.toDb(val);
        }
        return this.r.param(val);
    };
    /**
     * Converts an entity filter into a raw SQL condition - and appends to it any `backendPrefilter` and `backendPreprocessFilter`
     * @param {RepositoryOverloads<entityType>} repo - The repository.
     * @param {EntityFilter<entityType>} condition - The entity filter.
     * @returns {Promise<string>} - The raw SQL.
     */
    filterToRaw = async (repo, condition) => {
        return SqlDatabase.filterToRaw(repo, condition, this, undefined, this.wrapIdentifier);
    };
}
function isDbReadonly(field, dbNames) {
    return (field.dbReadOnly ||
        field.isServerExpression ||
        (field.options.sqlExpression && field.dbName != dbNames.$dbNameOf(field)));
}
function shouldNotCreateField(field, dbNames) {
    return Boolean(field.isServerExpression ||
        (field.options.sqlExpression && field.dbName != dbNames.$dbNameOf(field)));
}
async function dbNamesOf(repo, wrapIdentifierOrOptions) {
    return internalDbNamesOf(repo, wrapIdentifierOrOptions);
}
async function dbNamesOfWithForceSqlExpression(repo, wrapIdentifierOrOptions) {
    return internalDbNamesOf(repo, wrapIdentifierOrOptions, true);
}
async function internalDbNamesOf(repo, wrapIdentifierOrOptions, forceSqlExpression = false) {
    let options = typeof wrapIdentifierOrOptions === 'function'
        ? { wrapIdentifier: wrapIdentifierOrOptions }
        : wrapIdentifierOrOptions || {};
    var meta = getEntityMetadata(repo);
    if (!options.wrapIdentifier) {
        options.wrapIdentifier = remult.dataProvider.wrapIdentifier;
    }
    if (!options.wrapIdentifier)
        options.wrapIdentifier = (x) => x;
    const result = {
        $entityName: await entityDbName(meta, options.wrapIdentifier),
        toString: () => result.$entityName,
        $dbNameOf: (field) => {
            var key;
            if (typeof field === 'string')
                key = field;
            else
                key = field.key;
            return result[key];
        },
        wrapIdentifier: options.wrapIdentifier,
    };
    for (const field of meta.fields) {
        let r = await fieldDbName(field, meta, options.wrapIdentifier, forceSqlExpression);
        if (!field.options.sqlExpression)
            if (typeof options.tableName === 'string')
                r = options.wrapIdentifier(options.tableName) + '.' + r;
            else if (options.tableName === true) {
                r = result.$entityName + '.' + r;
            }
        result[field.key] = r;
    }
    return result;
}
function toDbSql(r, field, val) {
    return (field.valueConverter.toDbSql ?? ((x) => x))(r.param(val));
}

class Action {
    actionUrl;
    queue;
    allowed;
    constructor(actionUrl, queue, allowed) {
        this.actionUrl = actionUrl;
        this.queue = queue;
        this.allowed = allowed;
    }
    static apiUrlForJobStatus = 'jobStatusInQueue';
    async run(pIn, baseUrl, http) {
        if (baseUrl === undefined)
            baseUrl = remult.apiClient.url;
        if (!http)
            http = buildRestDataProvider(remult.apiClient.httpClient);
        let r = await http.post(baseUrl + '/' + this.actionUrl, pIn);
        let p = r;
        if (p && p.queuedJobId) {
            let progress = remultStatic.actionInfo.startBusyWithProgress();
            try {
                let runningJob;
                await remultStatic.actionInfo.runActionWithoutBlockingUI(async () => {
                    while (!runningJob || !runningJob.done) {
                        if (runningJob)
                            await new Promise((res) => setTimeout(() => {
                                res(undefined);
                            }, 200));
                        runningJob = await http.post(baseUrl + '/' + Action.apiUrlForJobStatus, { queuedJobId: r.queuedJobId });
                        if (runningJob.progress) {
                            progress.progress(runningJob.progress);
                        }
                    }
                });
                if (runningJob.error)
                    throw runningJob.error;
                progress.progress(1);
                return runningJob.result;
            }
            finally {
                progress.close();
            }
        }
        else
            return r;
    }
    doWork;
    __register(reg) {
        reg(this.actionUrl, this.queue, this.allowed, async (d, req, res) => {
            try {
                var r = await this.execute(d, req, res);
                res.success(r);
            }
            catch (err) {
                if (err.isForbiddenError)
                    // got a problem in next with instance of ForbiddenError  - so replaced it with this bool
                    res.forbidden();
                else
                    res.error(err, undefined);
            }
        });
    }
}
class ForbiddenError extends Error {
    constructor(message = 'Forbidden') {
        super(message);
    }
    isForbiddenError = true;
}
class myServerAction extends Action {
    types;
    options;
    originalMethod;
    constructor(name, types, options, originalMethod) {
        super(name, options.queue ?? false, options.allowed);
        this.types = types;
        this.options = options;
        this.originalMethod = originalMethod;
    }
    async execute(info, remult, res) {
        let result = { data: {} };
        let ds = remult.dataProvider;
        await decideTransaction(remult, this.options, async () => {
            if (!remult.isAllowedForInstance(undefined, this.options.allowed))
                throw new ForbiddenError();
            info.args = await prepareReceivedArgs(this.types(), info.args, remult, ds, res);
            try {
                result.data = await this.originalMethod(info.args);
            }
            catch (err) {
                throw err;
            }
        });
        return result;
    }
}
/**
 * Decorator indicating that the decorated method runs on the backend.
 * It allows the method to be invoked from the frontend while ensuring that the execution happens on the server side.
 * By default, the method runs within a database transaction, meaning it will either complete entirely or fail without making any partial changes.
 * This behavior can be controlled using the `transactional` option in the `BackendMethodOptions`.
 *
 * For more details, see: [Backend Methods](https://remult.dev/docs/backendMethods.html).
 *
 * @param options - Configuration options for the backend method, including permissions, routing, and transactional behavior.
 *
 * @example
 * ```typescript
 * @BackendMethod({ allowed: true })
 * async someBackendMethod() {
 *   // method logic here
 * }
 * ```
 */
function BackendMethod(options) {
    return (target, context, descriptor) => {
        const key = typeof context === 'string' ? context : context.name.toString();
        const originalMethod = descriptor ? descriptor.value : target;
        let result = originalMethod;
        checkTarget(target);
        function getTypes() {
            // removing import 'reflect-metadata' from server-action.ts, so we return an empty array
            var types = [];
            // typeof Reflect.getMetadata == 'function'
            //   ? Reflect.getMetadata('design:paramtypes', target, key)
            //   : []
            if (options.paramTypes)
                types =
                    typeof options.paramTypes === 'function'
                        ? options.paramTypes()
                        : options.paramTypes;
            return types;
        }
        if (target.prototype !== undefined) {
            // if types are undefined - you've forgot to set: "emitDecoratorMetadata":true
            let serverAction = new myServerAction((options?.apiPrefix ? options.apiPrefix + '/' : '') + key, () => getTypes(), options, (args) => originalMethod.apply(undefined, args));
            serverAction.doWork = async (args, self, url, http) => {
                args = prepareArgsToSend(getTypes(), args);
                if (options.blockUser === false) {
                    return await remultStatic.actionInfo.runActionWithoutBlockingUI(async () => (await serverAction.run({ args }, url, http)).data);
                }
                else
                    return (await serverAction.run({ args }, url, http)).data;
            };
            result = async function (...args) {
                if (!isBackend()) {
                    return await serverAction.doWork(args, undefined);
                }
                else
                    return await originalMethod.apply(
                    //@ts-ignore
                    this, args);
            };
            registerAction(target, result);
            result[serverActionField] = serverAction;
            if (descriptor) {
                descriptor.value = result;
                return descriptor;
            }
            else
                return result;
        }
        let x = remultStatic.classHelpers.get(target.constructor);
        if (!x) {
            x = new ClassHelper();
            remultStatic.classHelpers.set(target.constructor, x);
        }
        let serverAction = {
            __register(reg) {
                let c = new Remult();
                for (const constructor of x.classes.keys()) {
                    let controllerOptions = x.classes.get(constructor);
                    if (!controllerOptions.key) {
                        controllerOptions.key = c.repo(constructor).metadata.key;
                    }
                    reg(controllerOptions.key +
                        '/' +
                        (options?.apiPrefix ? options.apiPrefix + '/' : '') +
                        key, options ? (options.queue ?? false) : false, options.allowed, async (d, req, res) => {
                        d.args = d.args.map((x) => (isCustomUndefined(x) ? undefined : x));
                        let allowed = options.allowed;
                        try {
                            let remult = req;
                            let r;
                            await decideTransaction(remult, options, async () => {
                                d.args = await prepareReceivedArgs(getTypes(), d.args, remult, remult.dataProvider, res);
                                if (remultStatic.allEntities.includes(constructor)) {
                                    let repo = remult.repo(constructor);
                                    let y;
                                    const rowInfo = d.rowInfo;
                                    if (rowInfo.isNewRow) {
                                        y = repo.create();
                                        let rowHelper = repo.getEntityRef(y);
                                        await rowHelper._updateEntityBasedOnApi(rowInfo.data);
                                    }
                                    else {
                                        let rows = await repo.find({
                                            where: {
                                                ...repo.metadata.idMetadata.getIdFilter(rowInfo.id),
                                                $and: [repo.metadata.options.apiPrefilter ?? {}],
                                            },
                                        });
                                        if (rows.length != 1)
                                            throw new Error('not found or too many matches');
                                        y = rows[0];
                                        await repo.getEntityRef(y)._updateEntityBasedOnApi(rowInfo.data);
                                    }
                                    if (!remult.isAllowedForInstance(y, allowed))
                                        throw new ForbiddenError();
                                    let defs = getEntityRef(y);
                                    await defs.__validateEntity();
                                    try {
                                        r = {
                                            result: await originalMethod.apply(y, d.args),
                                            rowInfo: {
                                                data: await defs.toApiJson(),
                                                isNewRow: defs.isNew(),
                                                wasChanged: defs.wasChanged(),
                                                id: defs.getOriginalId(),
                                            },
                                        };
                                    }
                                    catch (err) {
                                        throw defs.catchSaveErrors(err);
                                    }
                                }
                                else {
                                    let y = new constructor(remult, remult.dataProvider);
                                    let controllerRef = getControllerRef(y, remult);
                                    await controllerRef._updateEntityBasedOnApi(d.fields);
                                    if (!remult.isAllowedForInstance(y, allowed))
                                        throw new ForbiddenError();
                                    await controllerRef.__validateEntity();
                                    try {
                                        r = {
                                            result: await originalMethod.apply(y, d.args),
                                            fields: await controllerRef.toApiJson(),
                                        };
                                    }
                                    catch (err) {
                                        throw controllerRef.catchSaveErrors(err);
                                    }
                                }
                            });
                            res.success(r);
                        }
                        catch (err) {
                            if (err.isForbiddenError)
                                // got a problem in next with instance of ForbiddenError  - so replaced it with this bool
                                res.forbidden();
                            else
                                res.error(err, undefined);
                        }
                    });
                }
            },
            doWork: async function (args, self, baseUrl, http) {
                args = prepareArgsToSend(getTypes(), args);
                if (remultStatic.allEntities.includes(target.constructor)) {
                    let defs = getEntityRef(self);
                    await defs.__validateEntity();
                    let classOptions = x.classes.get(self.constructor);
                    if (!classOptions.key) {
                        classOptions.key = defs.repository.metadata.key + '_methods';
                    }
                    try {
                        let r = await new (class extends Action {
                            execute;
                        })(classOptions.key +
                            '/' +
                            (options?.apiPrefix ? options.apiPrefix + '/' : '') +
                            key, options?.queue ?? false, options.allowed).run({
                            args,
                            rowInfo: {
                                data: await defs.toApiJson(),
                                isNewRow: defs.isNew(),
                                wasChanged: defs.wasChanged(),
                                id: defs.getOriginalId(),
                            },
                        }, baseUrl, http);
                        await defs._updateResultsFromServerAction(r.rowInfo);
                        return r.result;
                    }
                    catch (err) {
                        throw defs.catchSaveErrors(err);
                    }
                }
                else {
                    let defs = getControllerRef(self, undefined);
                    try {
                        await defs.__validateEntity();
                        let r = await new (class extends Action {
                            execute;
                        })(x.classes.get(self.constructor).key +
                            '/' +
                            (options?.apiPrefix ? options.apiPrefix + '/' : '') +
                            key, options?.queue ?? false, options.allowed).run({
                            args,
                            fields: await defs.toApiJson(),
                        }, baseUrl, http);
                        await defs._updateEntityBasedOnApi(r.fields);
                        return r.result;
                    }
                    catch (e) {
                        throw defs.catchSaveErrors(e);
                    }
                }
            },
        };
        result = async function (...args) {
            //@ts-ignore I specifically referred to the this of the original function - so it'll be sent inside
            let self = this;
            if (!isBackend()) {
                return serverAction.doWork(args, self);
            }
            else
                return await originalMethod.apply(self, args);
        };
        registerAction(target.constructor, result);
        result[serverActionField] = serverAction;
        if (descriptor) {
            descriptor.value = result;
            return descriptor;
        }
        else
            return result;
    };
}
const customUndefined = {
    _isUndefined: true,
};
function registerAction(target, resultMethod) {
    (target[classBackendMethodsArray] || (target[classBackendMethodsArray] = [])).push(resultMethod);
    remultStatic.actionInfo.allActions.push(resultMethod);
}
function isCustomUndefined(x) {
    return x && x._isUndefined;
}
class ProgressListener {
    res;
    constructor(res) {
        this.res = res;
    }
    progress(progress) {
        this.res.progress(progress);
    }
}
function prepareArgsToSend(types, args) {
    if (types) {
        for (let index = 0; index < types.length; index++) {
            const paramType = types[index];
            for (const type of [Remult, SqlDatabase]) {
                if (args[index] instanceof type)
                    args[index] = undefined;
                else if (paramType == type) {
                    args[index] = undefined;
                }
            }
            if (args[index] != undefined) {
                let x = { valueType: paramType };
                x = decorateColumnSettings(x, new Remult());
                let eo = getEntitySettings(paramType, false);
                if (eo != null) {
                    let rh = getEntityRef(args[index]);
                    args[index] = rh.getId();
                }
                if (x.valueConverter)
                    args[index] = x.valueConverter.toJson(args[index]);
            }
        }
    }
    return args.map((x) => (x !== undefined ? x : customUndefined));
}
async function prepareReceivedArgs(types, args, remult, ds, res) {
    for (let index = 0; index < args.length; index++) {
        const element = args[index];
        if (isCustomUndefined(element))
            args[index] = undefined;
    }
    if (types)
        for (let i = 0; i < types.length; i++) {
            if (args.length < i) {
                args.push(undefined);
            }
            if (types[i] == Remult || types[i] == Remult) {
                args[i] = remult;
            }
            else if (types[i] == SqlDatabase && ds) {
                args[i] = ds;
            }
            else if (types[i] == ProgressListener) {
                args[i] = new ProgressListener(res);
            }
            else {
                let x = { valueType: types[i] };
                x = decorateColumnSettings(x, remult);
                if (x.valueConverter)
                    args[i] = x.valueConverter.fromJson(args[i]);
                let eo = getEntitySettings(types[i], false);
                if (eo != null) {
                    if (!(args[i] === null || args[i] === undefined))
                        args[i] = await remult.repo(types[i]).findId(args[i]);
                }
            }
        }
    return args;
}
const classBackendMethodsArray = Symbol.for('classBackendMethodsArray');
//
async function decideTransaction(remult, options, what) {
    if (options.transactional === undefined || options.transactional === true)
        return await doTransaction(remult, what);
    else
        await what(remult.dataProvider);
}

//#region src/lib/shared/agent-runtime/agent-registry.ts
var AgentRegistry = class {
	agents = /* @__PURE__ */ new Map();
	register(config) {
		this.agents.set(config.name, config);
	}
	get(name) {
		return this.agents.get(name);
	}
	list() {
		return Array.from(this.agents.values());
	}
};
var agentRegistry = new AgentRegistry();
agentRegistry.register({
	name: "assistant",
	modelProvider: "",
	modelId: "",
	systemPrompt: "",
	toolNames: ["get_time"]
});
//#endregion
//#region src/lib/shared/agent-runtime/tools/get-time.ts
var getTimeTool = {
	name: "get_time",
	description: "Get the current date and time in a specific timezone",
	parameters: Type.Object({ timezone: Type.Optional(Type.String({ description: "IANA timezone string (e.g. America/New_York, Europe/London, Asia/Tokyo). Defaults to UTC." })) }),
	async execute(args) {
		const tz = typeof args.timezone === "string" ? args.timezone : "UTC";
		try {
			return {
				result: (/* @__PURE__ */ new Date()).toLocaleString("en-US", {
					timeZone: tz,
					dateStyle: "full",
					timeStyle: "long"
				}),
				isError: false
			};
		} catch {
			return {
				result: `Invalid timezone: ${tz}`,
				isError: true
			};
		}
	}
};
//#endregion
//#region src/lib/shared/agent-runtime/agent-tools.ts
var ToolRegistry = class {
	tools = /* @__PURE__ */ new Map();
	register(tool) {
		this.tools.set(tool.name, tool);
	}
	get(name) {
		return this.tools.get(name);
	}
	getPiAiTools() {
		return Array.from(this.tools.values()).map((t) => ({
			name: t.name,
			description: t.description,
			parameters: t.parameters
		}));
	}
	async execute(name, args) {
		const tool = this.tools.get(name);
		if (!tool) return {
			result: `Tool "${name}" not found`,
			isError: true
		};
		try {
			return await tool.execute(args);
		} catch (err) {
			return {
				result: String(err),
				isError: true
			};
		}
	}
};
var toolRegistry = new ToolRegistry();
toolRegistry.register(getTimeTool);
//#endregion
//#region src/lib/shared/agent-runtime/agent-context.ts
async function buildContext(sessionId, config, prompt) {
	const limit = config.contextWindow ?? 20;
	const prevMessages = await remult.repo(ChatMessage).find({
		where: { sessionId },
		orderBy: { sortOrder: "desc" },
		limit
	});
	prevMessages.reverse();
	const messages = prevMessages.map((m) => {
		const ts = m.createdAt.getTime();
		if (m.role === "user") return {
			role: "user",
			content: m.content,
			timestamp: ts
		};
		if (m.role === "assistant") {
			const content = [];
			if (m.content) content.push({
				type: "text",
				text: m.content
			});
			if (m.toolCalls && m.toolCalls.length > 0) for (const tc of m.toolCalls) content.push({
				type: "toolCall",
				id: tc.id,
				name: tc.name,
				arguments: tc.args ?? {}
			});
			return {
				role: "assistant",
				content,
				timestamp: ts
			};
		}
		if (m.role === "tool") return {
			role: "toolResult",
			toolCallId: m.toolCallId,
			toolName: m.toolName ?? "",
			content: [{
				type: "text",
				text: m.content
			}],
			isError: m.isError ?? false,
			timestamp: ts
		};
		return null;
	}).filter((m) => m !== null);
	messages.push({
		role: "user",
		content: prompt,
		timestamp: Date.now()
	});
	const allTools = toolRegistry.getPiAiTools();
	const toolNamesSet = new Set(config.toolNames);
	const tools = allTools.filter((t) => toolNamesSet.has(t.name));
	return {
		systemPrompt: config.systemPrompt ?? "",
		messages,
		tools
	};
}
async function persistToolResult(sessionId, tc, timestamp) {
	if (tc.result === void 0) return;
	await remult.repo(ChatMessage).insert({
		id: crypto.randomUUID(),
		sessionId,
		role: "tool",
		content: typeof tc.result === "string" ? tc.result : JSON.stringify(tc.result),
		toolCallId: tc.id,
		toolName: tc.name,
		isError: tc.isError ?? false,
		sortOrder: timestamp,
		createdAt: new Date(timestamp)
	});
}
//#endregion
//#region src/lib/shared/agent-runtime/agent-stream.ts
async function buildCustomModel(providerId, modelId) {
	const settings = await remult.repo(ProviderSetting).findId(providerId);
	if (!settings?.baseUrl) return void 0;
	return {
		id: modelId,
		name: modelId,
		api: settings.apiType ?? "openai-completions",
		provider: providerId,
		baseUrl: settings.baseUrl,
		reasoning: false,
		input: ["text"],
		cost: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0
		},
		contextWindow: 4096,
		maxTokens: 4096
	};
}
function genId() {
	return crypto.randomUUID();
}
async function updateActiveStream(stream, text, toolCalls, segments) {
	await remult.repo(ActiveStream).update(stream.id, {
		text,
		toolCalls: toolCalls.map((t) => ({ ...t })),
		segments
	});
}
async function insertAssistantMessage(sessionId, text, toolCalls, sortOrder) {
	await remult.repo(ChatMessage).insert({
		id: genId(),
		sessionId,
		role: "assistant",
		content: text,
		toolCalls: toolCalls.length > 0 ? toolCalls.map((t) => ({
			id: t.id,
			name: t.name,
			args: t.args
		})) : void 0,
		sortOrder,
		createdAt: new Date(sortOrder)
	});
}
async function insertActiveStream(sessionId, prompt) {
	return await remult.repo(ActiveStream).insert({
		id: genId(),
		sessionId,
		prompt,
		text: "",
		isGenerating: true,
		createdAt: /* @__PURE__ */ new Date(),
		toolCalls: []
	});
}
async function insertUserMessage(sessionId, content) {
	await remult.repo(ChatMessage).insert({
		id: genId(),
		sessionId,
		role: "user",
		content,
		sortOrder: Date.now(),
		createdAt: /* @__PURE__ */ new Date()
	});
}
var THROTTLE_MS = 100;
async function handleTextDelta(event, state, stream) {
	const t = event.delta;
	if (!t) return;
	state.accumulatedText += t;
	if (state.lastWasTool || state.segments.length === 0) {
		state.segments.push({
			type: "text",
			text: t
		});
		state.lastWasTool = false;
	} else {
		const last = state.segments[state.segments.length - 1];
		if (last.type === "text") last.text += t;
	}
	const now = Date.now();
	if (now - state.lastUpdate > THROTTLE_MS) {
		await updateActiveStream(stream, state.accumulatedText, state.toolCalls, state.segments);
		state.lastUpdate = now;
	}
}
async function handleToolCallStart(event, state, stream) {
	const idx = event.contentIndex;
	const tcBlock = event.partial?.content?.[idx];
	const tcId = tcBlock?.id ?? "unknown";
	const tcName = tcBlock?.name ?? "unknown";
	if (!state.toolCalls.find((t) => t.id === tcId)) {
		state.toolCalls.push({
			id: tcId,
			name: tcName,
			args: {},
			result: void 0,
			isError: false
		});
		state.segments.push({
			type: "tool",
			toolCallId: tcId,
			toolName: tcName,
			args: {},
			result: void 0,
			isError: false
		});
		state.lastWasTool = true;
		await updateActiveStream(stream, state.accumulatedText, state.toolCalls, state.segments);
	}
}
async function handleToolCallEnd(event, state, stream) {
	const tc = event.toolCall;
	const existing = state.toolCalls.find((t) => t.id === tc.id);
	if (existing) existing.args = tc.arguments;
	else {
		state.toolCalls.push({
			id: tc.id,
			name: tc.name,
			args: tc.arguments,
			result: void 0,
			isError: false
		});
		state.segments.push({
			type: "tool",
			toolCallId: tc.id,
			toolName: tc.name,
			args: tc.arguments,
			result: void 0,
			isError: false
		});
	}
	const seg = state.segments.find((s) => s.type === "tool" && s.toolCallId === tc.id);
	if (seg && seg.type === "tool") seg.args = tc.arguments;
	await updateActiveStream(stream, state.accumulatedText, state.toolCalls, state.segments);
}
function handleDone(event, state, context) {
	const content = [];
	if (state.accumulatedText) content.push({
		type: "text",
		text: state.accumulatedText
	});
	for (const tc of state.toolCalls) content.push({
		type: "toolCall",
		id: tc.id,
		name: tc.name,
		arguments: tc.args
	});
	context.messages.push({
		role: "assistant",
		content,
		timestamp: Date.now()
	});
}
async function runStreamLoop(config, context, sessionId, streamId) {
	const model = getModel(config.modelProvider, config.modelId) ?? buildCustomModel(config.modelProvider, config.modelId);
	if (!model) throw new Error(`Model ${config.modelProvider}/${config.modelId} not found`);
	const stream = await remult.repo(ActiveStream).findId(streamId);
	if (!stream) throw new Error(`ActiveStream ${streamId} not found`);
	const state = {
		accumulatedText: "",
		lastWasTool: false,
		toolCalls: [],
		segments: [],
		lastUpdate: 0
	};
	while (true) {
		const eventStream = streamSimple(model, context);
		for await (const event of eventStream) switch (event.type) {
			case "text_delta":
				await handleTextDelta(event, state, stream);
				break;
			case "toolcall_start":
				await handleToolCallStart(event, state, stream);
				break;
			case "toolcall_end":
				await handleToolCallEnd(event, state, stream);
				break;
			case "done":
				handleDone(event, state, context);
				break;
			case "error":
				console.error("[stream] stream error:", event.error);
				await updateActiveStream(stream, `> **Error:** ${event.error?.errorMessage || "Unknown stream error"}`, [], [{
					type: "text",
					text: `Error: ${event.error?.errorMessage || "Unknown stream error"}`
				}]);
				break;
		}
		if (state.accumulatedText || state.toolCalls.length > 0) {
			await insertAssistantMessage(sessionId, state.accumulatedText, state.toolCalls, Date.now());
			await updateActiveStream(stream, "", [], []);
		}
		const pendingToolCalls = state.toolCalls.filter((t) => t.result === void 0);
		if (pendingToolCalls.length === 0) break;
		for (const tc of pendingToolCalls) {
			const { result, isError } = await toolRegistry.execute(tc.name, tc.args);
			tc.result = result;
			tc.isError = isError;
			const seg = state.segments.find((s) => s.type === "tool" && s.toolCallId === tc.id);
			if (seg && seg.type === "tool") {
				seg.result = result;
				seg.isError = isError;
			}
			context.messages.push({
				role: "toolResult",
				toolCallId: tc.id,
				toolName: tc.name,
				content: [{
					type: "text",
					text: result
				}],
				isError,
				timestamp: Date.now()
			});
			await persistToolResult(sessionId, tc, Date.now());
		}
		state.accumulatedText = "";
		state.toolCalls = [];
		state.segments = [];
	}
}
//#endregion
//#region src/lib/shared/services/agent-service.ts
var encryption = null;
function encryptionModule() {
	return import(
		/* @vite-ignore */
		[
			"..",
			"..",
			"server",
			"encryption"
		].join("/")
);
}
async function getEncryption() {
	if (!encryption) encryption = await encryptionModule();
	return encryption;
}
/**
* Map a provider ID to the environment variable names pi-ai checks for its API key.
* Mirrors pi-ai's internal `getApiKeyEnvVars` (not exported).
*/
var API_KEY_ENV_MAP = {
	"github-copilot": ["COPILOT_GITHUB_TOKEN"],
	"anthropic": ["ANTHROPIC_OAUTH_TOKEN", "ANTHROPIC_API_KEY"],
	"ant-ling": ["ANT_LING_API_KEY"],
	"openai": ["OPENAI_API_KEY"],
	"azure-openai-responses": ["AZURE_OPENAI_API_KEY"],
	"nvidia": ["NVIDIA_API_KEY"],
	"deepseek": ["DEEPSEEK_API_KEY"],
	"google": ["GEMINI_API_KEY"],
	"google-vertex": ["GOOGLE_CLOUD_API_KEY"],
	"groq": ["GROQ_API_KEY"],
	"cerebras": ["CEREBRAS_API_KEY"],
	"xai": ["XAI_API_KEY"],
	"openrouter": ["OPENROUTER_API_KEY"],
	"vercel-ai-gateway": ["AI_GATEWAY_API_KEY"],
	"zai": ["ZAI_API_KEY"],
	"zai-coding-cn": ["ZAI_CODING_CN_API_KEY"],
	"mistral": ["MISTRAL_API_KEY"],
	"minimax": ["MINIMAX_API_KEY"],
	"minimax-cn": ["MINIMAX_CN_API_KEY"],
	"moonshotai": ["MOONSHOT_API_KEY"],
	"moonshotai-cn": ["MOONSHOT_API_KEY"],
	"huggingface": ["HF_TOKEN"],
	"fireworks": ["FIREWORKS_API_KEY"],
	"together": ["TOGETHER_API_KEY"],
	"opencode": ["OPENCODE_API_KEY"],
	"opencode-go": ["OPENCODE_API_KEY"],
	"kimi-coding": ["KIMI_API_KEY"],
	"cloudflare-workers-ai": ["CLOUDFLARE_API_KEY"],
	"cloudflare-ai-gateway": ["CLOUDFLARE_API_KEY"],
	"xiaomi": ["XIAOMI_API_KEY"],
	"xiaomi-token-plan-cn": ["XIAOMI_TOKEN_PLAN_CN_API_KEY"],
	"xiaomi-token-plan-ams": ["XIAOMI_TOKEN_PLAN_AMS_API_KEY"],
	"xiaomi-token-plan-sgp": ["XIAOMI_TOKEN_PLAN_SGP_API_KEY"]
};
function getApiKeyEnvVars(providerId) {
	const known = API_KEY_ENV_MAP[providerId];
	if (known) return known;
	return [`${providerId.replace(/-/g, "_").toUpperCase()}_API_KEY`];
}
var AgentService = class {
	static async ask(prompt, sessionId = "default") {
		const sessionSettings = await remult.repo(ChatSessionSettings).findId(sessionId);
		const baseConfig = agentRegistry.get("assistant");
		const config = {
			...baseConfig,
			modelProvider: sessionSettings?.modelProvider ?? baseConfig.modelProvider,
			modelId: sessionSettings?.modelId ?? baseConfig.modelId,
			contextWindow: sessionSettings?.contextWindow ?? 20
		};
		if (!config.modelProvider || !config.modelId) throw new Error("No model selected. Open the sidebar, configure a provider with an API key, then select a model.");
		const providerSettings = await remult.repo(ProviderSetting).find({ where: { enabled: true } });
		const enc = await getEncryption();
		let configuredCount = 0;
		for (const setting of providerSettings) if (setting.apiKey) {
			const decrypted = enc.decrypt(setting.apiKey);
			configuredCount++;
			if (setting.baseUrl) {
				const apiKeyEnv = setting.apiType === "anthropic-messages" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
				process.env[apiKeyEnv] = decrypted;
			} else {
				const envVars = getApiKeyEnvVars(setting.id);
				for (const envKey of envVars) process.env[envKey] = decrypted;
			}
		}
		if (!providerSettings.find((s) => s.id === config.modelProvider)?.apiKey) {
			if (configuredCount === 0) throw new Error("No API keys configured. Open the sidebar, add a provider, and enter your API key.");
			throw new Error(`Provider "${config.modelProvider}" has no API key configured. Add its key in the sidebar providers.`);
		}
		await insertUserMessage(sessionId, prompt);
		const activeStream = await insertActiveStream(sessionId, prompt);
		const context = await buildContext(sessionId, config, prompt);
		try {
			await runStreamLoop(config, context, sessionId, activeStream.id);
		} catch (err) {
			console.error("[ask] stream error:", err);
		} finally {
			setTimeout(() => {
				remult.repo(ActiveStream).delete(activeStream.id).catch(() => {});
			}, 800);
		}
		return sessionId;
	}
	static async getProvidersInfo() {
		const { getProviders, getModels, findEnvKeys } = await import('@earendil-works/pi-ai');
		const builtins = getProviders().map((p) => {
			return {
				id: p,
				envKeys: findEnvKeys(p) ?? [],
				models: getModels(p).map((m) => m.id),
				isCustom: false
			};
		});
		const customProviders = (await remult.repo(ProviderSetting).find({ where: { baseUrl: { $ne: null } } })).filter((s) => s.baseUrl).map((s) => ({
			id: s.id,
			envKeys: [`CUSTOM_${s.id}_API_KEY`],
			models: s.models ? s.models.split(",").map((m) => m.trim()) : [],
			isCustom: true
		}));
		return [...builtins, ...customProviders];
	}
	static async getProviderApiKeys() {
		const settings = await remult.repo(ProviderSetting).find();
		const enc = await getEncryption();
		const keys = {};
		for (const s of settings) if (s.apiKey) try {
			keys[s.id] = enc.decrypt(s.apiKey);
		} catch {
			keys[s.id] = s.apiKey;
		}
		return keys;
	}
	static async saveProviderKey(providerId, apiKey) {
		const enc = await getEncryption();
		const encrypted = apiKey ? enc.encrypt(apiKey) : "";
		const existing = await remult.repo(ProviderSetting).findId(providerId);
		if (existing) {
			existing.apiKey = encrypted;
			await remult.repo(ProviderSetting).save(existing);
		} else await remult.repo(ProviderSetting).insert({
			id: providerId,
			apiKey: encrypted,
			enabled: true
		});
	}
	static async saveCustomProvider(providerId, apiKey, baseUrl, apiType, models) {
		const enc = await getEncryption();
		const encrypted = apiKey ? enc.encrypt(apiKey) : "";
		await remult.repo(ProviderSetting).save({
			id: providerId,
			apiKey: encrypted,
			baseUrl,
			apiType,
			models: models.join(",")
		});
	}
	static async deleteProviderKey(providerId) {
		await remult.repo(ProviderSetting).delete(providerId);
	}
	static async getConfiguredProviders() {
		return (await remult.repo(ProviderSetting).find()).map((s) => ({
			id: s.id,
			enabled: s.enabled,
			hasKey: !!s.apiKey,
			baseUrl: s.baseUrl,
			apiType: s.apiType,
			models: s.models
		}));
	}
	static async addProvider(providerId) {
		await remult.repo(ProviderSetting).save({
			id: providerId,
			apiKey: "",
			enabled: true
		});
	}
	static async toggleProvider(providerId, enabled) {
		const setting = await remult.repo(ProviderSetting).findId(providerId);
		if (setting) {
			setting.enabled = enabled;
			await remult.repo(ProviderSetting).save(setting);
		}
	}
	static async clearHistory() {
		await remult.repo(ActiveStream).deleteMany({ where: "all" });
		await remult.repo(ChatMessage).deleteMany({ where: "all" });
	}
	static async recoverMessages(sessionId) {
		return await remult.repo(ChatMessage).count({ sessionId });
	}
	static async listSessions() {
		return (await SqlDatabase.getDb().execute(`
			SELECT sessionId, content, createdAt
			FROM chatMessages m
			WHERE sortOrder = (
				SELECT min(sortOrder)
				FROM chatMessages m2
				WHERE m2.sessionId = m.sessionId
			)
			ORDER BY createdAt DESC
		`)).rows.map((r) => ({
			sessionId: r.sessionId,
			createdAt: new Date(r.createdAt).toISOString(),
			preview: String(r.content ?? "").slice(0, 120)
		}));
	}
};
__decorate([BackendMethod({
	allowed: true,
	transactional: false
})], AgentService, "ask", null);
__decorate([BackendMethod({
	allowed: true,
	transactional: false
})], AgentService, "getProvidersInfo", null);
__decorate([BackendMethod({
	allowed: true,
	transactional: false
})], AgentService, "getProviderApiKeys", null);
__decorate([BackendMethod({ allowed: true })], AgentService, "saveProviderKey", null);
__decorate([BackendMethod({
	allowed: true,
	transactional: false
})], AgentService, "saveCustomProvider", null);
__decorate([BackendMethod({ allowed: true })], AgentService, "deleteProviderKey", null);
__decorate([BackendMethod({
	allowed: true,
	transactional: false
})], AgentService, "getConfiguredProviders", null);
__decorate([BackendMethod({ allowed: true })], AgentService, "addProvider", null);
__decorate([BackendMethod({ allowed: true })], AgentService, "toggleProvider", null);
__decorate([BackendMethod({ allowed: true })], AgentService, "clearHistory", null);
__decorate([BackendMethod({
	allowed: true,
	transactional: false
})], AgentService, "recoverMessages", null);
__decorate([BackendMethod({
	allowed: true,
	transactional: false
})], AgentService, "listSessions", null);

export { AgentService as A, ForbiddenError as F, SqlDatabase as S, Action as a, classBackendMethodsArray as c, dbNamesOf as d, isDbReadonly as i, shouldNotCreateField as s };
//# sourceMappingURL=agent-service-ZiiPDM6E.js.map
