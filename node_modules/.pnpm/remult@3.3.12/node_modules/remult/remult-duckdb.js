"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuckDBDataProvider = void 0;
var tslib_1 = require("tslib");
var node_api_1 = require("@duckdb/node-api");
var remult_sqlite_core_js_1 = require("./remult-sqlite-core.js");
var index_js_1 = require("./index.js");
var filter_consumer_bridge_to_sql_request_js_1 = require("./src/filter/filter-consumer-bridge-to-sql-request.js");
var RepositoryImplementation_js_1 = require("./src/remult3/RepositoryImplementation.js");
var DuckDBDataProvider = /** @class */ (function (_super) {
    tslib_1.__extends(DuckDBDataProvider, _super);
    function DuckDBDataProvider(connection) {
        var _this = _super.call(this, function () { return new DuckDBCommand(_this.connection); }, function () { return tslib_1.__awaiter(_this, void 0, void 0, function () { return tslib_1.__generator(this, function (_a) {
            return [2 /*return*/, this.connection.disconnectSync()];
        }); }); }, false, true) || this;
        _this.connection = connection;
        return _this;
    }
    DuckDBDataProvider.prototype.wrapIdentifier = function (name) {
        return "\"".concat(name, "\"");
    };
    DuckDBDataProvider.prototype.getCreateTableSql = function (entity) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var result, e, createSequenceStatements, createTableSql, _a, _b, x, sequenceName;
            var e_1, _c;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        result = '';
                        return [4 /*yield*/, (0, index_js_1.dbNamesOf)(entity, this.wrapIdentifier)];
                    case 1:
                        e = _d.sent();
                        createSequenceStatements = [];
                        createTableSql = '';
                        try {
                            for (_a = tslib_1.__values(entity.fields), _b = _a.next(); !_b.done; _b = _a.next()) {
                                x = _b.value;
                                if (!(0, filter_consumer_bridge_to_sql_request_js_1.shouldNotCreateField)(x, e) || (0, RepositoryImplementation_js_1.isAutoIncrement)(x)) {
                                    if (result.length != 0)
                                        result += ',';
                                    result += '\r\n  ';
                                    if ((0, RepositoryImplementation_js_1.isAutoIncrement)(x)) {
                                        sequenceName = "".concat(entity.dbName, "_").concat(x.dbName, "_seq");
                                        createSequenceStatements.push("create sequence if not exists \"".concat(sequenceName, "\";"));
                                        result += "".concat(e.$dbNameOf(x), " integer default nextval('").concat(sequenceName, "')");
                                    }
                                    else {
                                        result += this.addColumnSqlSyntax(x, e.$dbNameOf(x), false);
                                    }
                                }
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        result += ",\r\n   primary key (".concat(entity.idMetadata.fields
                            .map(function (f) { return e.$dbNameOf(f); })
                            .join(','), ")");
                        createTableSql =
                            'create table if not exists ' + e.$entityName + ' (' + result + '\r\n)';
                        return [2 /*return*/, tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(createSequenceStatements), false), [createTableSql], false)];
                }
            });
        });
    };
    DuckDBDataProvider.prototype.addColumnSqlSyntax = function (x, dbName, isAlterColumn) {
        var result = dbName;
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
                if (x.valueConverter == index_js_1.ValueConverters.DateOnly)
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
    };
    return DuckDBDataProvider;
}(remult_sqlite_core_js_1.SqliteCoreDataProvider));
exports.DuckDBDataProvider = DuckDBDataProvider;
var DuckDBCommand = /** @class */ (function () {
    function DuckDBCommand(connection) {
        this.connection = connection;
        this.values = [];
    }
    DuckDBCommand.prototype.execute = function (sql) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var result, err_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.connection.run(sql, this.values)];
                    case 1:
                        result = _a.sent();
                        this.values = [];
                        return [2 /*return*/, new DuckDBSqlResult(result)];
                    case 2:
                        err_1 = _a.sent();
                        this.values = [];
                        throw err_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DuckDBCommand.prototype.addParamInternal = function (val) {
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
    };
    DuckDBCommand.prototype.addParameterAndReturnSqlToken = function (val) {
        return this.addParamInternal(val);
    };
    DuckDBCommand.prototype.param = function (val) {
        return this.addParamInternal(val);
    };
    return DuckDBCommand;
}());
var DuckDBSqlResult = /** @class */ (function () {
    function DuckDBSqlResult(duckDbResult) {
        var _a;
        this.duckDbResult = duckDbResult;
        this.rows = [];
        var columnNames = this.duckDbResult.columnNames();
        var columnTypes = this.duckDbResult.columnTypes();
        var chunkCount = this.duckDbResult.chunkCount;
        for (var i = 0; i < chunkCount; i++) {
            var chunk = this.duckDbResult.getChunk(i);
            var chunkRowObjects = chunk.getRowObjects(columnNames).map(function (row) {
                var convertedRow = {};
                columnNames.forEach(function (colName, colIndex) {
                    var value = row[colName];
                    if (value === null) {
                        convertedRow[colName] = null;
                    }
                    else {
                        var colType = columnTypes[colIndex];
                        var typeId = colType.typeId;
                        if (typeId === node_api_1.DuckDBTypeId.TIMESTAMP) {
                            var timestampValue = value;
                            var parts = timestampValue.toParts();
                            convertedRow[colName] = new Date(Date.UTC(parts.date.year, parts.date.month - 1, parts.date.day, parts.time.hour, parts.time.min, parts.time.sec, Math.floor(parts.time.micros / 1000)));
                        }
                        else if (typeId === node_api_1.DuckDBTypeId.DATE) {
                            var dateValue = value;
                            var parts = dateValue.toParts();
                            convertedRow[colName] = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
                        }
                        else {
                            convertedRow[colName] = value;
                        }
                    }
                });
                return convertedRow;
            });
            (_a = this.rows).push.apply(_a, tslib_1.__spreadArray([], tslib_1.__read(chunkRowObjects), false));
        }
    }
    DuckDBSqlResult.prototype.getColumnKeyInResultForIndexInSelect = function (index) {
        return this.duckDbResult.columnName(index);
    };
    return DuckDBSqlResult;
}());
