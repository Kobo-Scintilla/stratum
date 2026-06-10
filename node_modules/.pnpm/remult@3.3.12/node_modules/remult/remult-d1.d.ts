import { SqlDatabase, type SqlImplementation } from './index.js';
import { SqliteCoreDataProvider } from './remult-sqlite-core.js';
export declare function createD1DataProvider(d1: D1Database): SqlDatabase;
export declare class D1DataProvider extends SqliteCoreDataProvider {
    private d1;
    /**
     * For production or local d1 using binding
     *
     * const dataProvider = new SqlDatabase(new D1DataProvider(new D1BindingClient(d1)))
     */
    constructor(d1: D1Client);
    transaction(action: (sql: SqlImplementation) => Promise<void>): Promise<void>;
}
export type D1RowObject = Record<string, unknown>;
export interface D1Client {
    execute(sql: string, params?: unknown[]): Promise<D1RowObject[]>;
}
export declare class D1BindingClient implements D1Client {
    private d1;
    /**
     * Simple d1 client that wraps the d1 binding directly
     *
     * const d1 = new D1BindingClient(env.DB)
     */
    constructor(d1: D1Database);
    execute(sql: string, params?: unknown[]): Promise<D1RowObject[]>;
}
