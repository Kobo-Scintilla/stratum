import { SqlDatabase } from './index.js';
import { type D1Client, D1DataProvider, type D1RowObject } from './remult-d1.js';
export { D1DataProvider };
type D1Credentials = {
    accountId: string;
    apiToken: string;
    databaseId: string;
};
export declare function createD1HttpDataProvider(creds: D1Credentials): SqlDatabase;
export declare class D1HttpClient implements D1Client {
    private d1;
    private accountId;
    private databaseId;
    constructor({ accountId, databaseId, apiToken }: D1Credentials);
    execute(sql: string, params?: unknown[]): Promise<D1RowObject[]>;
}
