import type { DuckDBConnection } from '@duckdb/node-api';
import { SqliteCoreDataProvider } from './remult-sqlite-core.js';
import { type FieldMetadata, type EntityMetadata } from './index.js';
export declare class DuckDBDataProvider extends SqliteCoreDataProvider {
    private connection;
    constructor(connection: DuckDBConnection);
    wrapIdentifier(name: string): string;
    getCreateTableSql(entity: EntityMetadata<any>): Promise<string[]>;
    addColumnSqlSyntax(x: FieldMetadata, dbName: string, isAlterColumn: boolean): string;
}
