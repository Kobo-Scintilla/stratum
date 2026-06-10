import { DuckDBTypeId } from '@duckdb/node-api';
import { SqliteCoreDataProvider } from './remult-sqlite-core.js';
import { ValueConverters, dbNamesOf, } from './index.js';
import { shouldNotCreateField } from './src/filter/filter-consumer-bridge-to-sql-request.js';
import { isAutoIncrement } from './src/remult3/RepositoryImplementation.js';
export class DuckDBDataProvider extends SqliteCoreDataProvider {
    connection;
    constructor(connection) {
        super(() => new DuckDBCommand(this.connection), async () => this.connection.disconnectSync(), false, true);
        this.connection = connection;
    }
    wrapIdentifier(name) {
        return `"${name}"`;
    }
    async getCreateTableSql(entity) {
        let result = '';
        let e = await dbNamesOf(entity, this.wrapIdentifier);
        const createSequenceStatements = [];
        let createTableSql = '';
        for (const x of entity.fields) {
            if (!shouldNotCreateField(x, e) || isAutoIncrement(x)) {
                if (result.length != 0)
                    result += ',';
                result += '\r\n  ';
                if (isAutoIncrement(x)) {
                    const sequenceName = `${entity.dbName}_${x.dbName}_seq`;
                    createSequenceStatements.push(`create sequence if not exists "${sequenceName}";`);
                    result += `${e.$dbNameOf(x)} integer default nextval('${sequenceName}')`;
                }
                else {
                    result += this.addColumnSqlSyntax(x, e.$dbNameOf(x), false);
                }
            }
        }
        result += `,\r\n   primary key (${entity.idMetadata.fields
            .map((f) => e.$dbNameOf(f))
            .join(',')})`;
        createTableSql =
            'create table if not exists ' + e.$entityName + ' (' + result + '\r\n)';
        return [...createSequenceStatements, createTableSql];
    }
    addColumnSqlSyntax(x, dbName, isAlterColumn) {
        let result = dbName;
        var allowNull = x.allowNull;
        if (!allowNull && isAlterColumn) {
            allowNull = true;
            console.log('DuckDB does not support altering columns to allow null on existing tables');
        }
        if (x.valueType == Number) {
            if (!x.valueConverter.fieldTypeInDb)
                result += ' numeric' + (allowNull ? '' : ' default 0 not null');
            else
                result +=
                    ' ' +
                        x.valueConverter.fieldTypeInDb +
                        (allowNull ? '' : ' default 0 not null');
        }
        else if (x.valueType == Date) {
            if (!x.valueConverter.fieldTypeInDb)
                if (x.valueConverter == ValueConverters.DateOnly)
                    result += ' date';
                else
                    result += ' timestamp';
            else
                result += ' ' + x.valueConverter.fieldTypeInDb;
        }
        else if (x.valueType == Boolean)
            result += ' boolean' + (allowNull ? '' : ' default false not null');
        else if (x.valueConverter.fieldTypeInDb) {
            result += ' ' + x.valueConverter.fieldTypeInDb;
            if (!allowNull && x.valueConverter.fieldTypeInDb == 'integer') {
                result += ' default 0 not null';
            }
        }
        else
            result += ' varchar' + (allowNull ? '' : " default '' not null");
        return result;
    }
}
class DuckDBCommand {
    connection;
    values = [];
    constructor(connection) {
        this.connection = connection;
    }
    async execute(sql) {
        try {
            const result = await this.connection.run(sql, this.values);
            this.values = [];
            return new DuckDBSqlResult(result);
        }
        catch (err) {
            this.values = [];
            throw err;
        }
    }
    addParamInternal(val) {
        if (val === undefined) {
            this.values.push(null);
        }
        else if (val instanceof Date) {
            this.values.push(val.toISOString());
        }
        else {
            this.values.push(val);
        }
        return '?';
    }
    addParameterAndReturnSqlToken(val) {
        return this.addParamInternal(val);
    }
    param(val) {
        return this.addParamInternal(val);
    }
}
class DuckDBSqlResult {
    duckDbResult;
    rows;
    constructor(duckDbResult) {
        this.duckDbResult = duckDbResult;
        this.rows = [];
        const columnNames = this.duckDbResult.columnNames();
        const columnTypes = this.duckDbResult.columnTypes();
        const chunkCount = this.duckDbResult.chunkCount;
        for (let i = 0; i < chunkCount; i++) {
            const chunk = this.duckDbResult.getChunk(i);
            const chunkRowObjects = chunk.getRowObjects(columnNames).map((row) => {
                const convertedRow = {};
                columnNames.forEach((colName, colIndex) => {
                    const value = row[colName];
                    if (value === null) {
                        convertedRow[colName] = null;
                    }
                    else {
                        const colType = columnTypes[colIndex];
                        const typeId = colType.typeId;
                        if (typeId === DuckDBTypeId.TIMESTAMP) {
                            const timestampValue = value;
                            const parts = timestampValue.toParts();
                            convertedRow[colName] = new Date(Date.UTC(parts.date.year, parts.date.month - 1, parts.date.day, parts.time.hour, parts.time.min, parts.time.sec, Math.floor(parts.time.micros / 1000)));
                        }
                        else if (typeId === DuckDBTypeId.DATE) {
                            const dateValue = value;
                            const parts = dateValue.toParts();
                            convertedRow[colName] = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
                        }
                        else {
                            convertedRow[colName] = value;
                        }
                    }
                });
                return convertedRow;
            });
            this.rows.push(...chunkRowObjects);
        }
    }
    getColumnKeyInResultForIndexInSelect(index) {
        return this.duckDbResult.columnName(index);
    }
}
