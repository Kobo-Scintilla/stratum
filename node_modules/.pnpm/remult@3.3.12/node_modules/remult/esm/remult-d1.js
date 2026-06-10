/// <reference types="@cloudflare/workers-types" />
import { SqlDatabase, } from './index.js';
import { SqliteCoreDataProvider } from './remult-sqlite-core.js';
export function createD1DataProvider(d1) {
    return new SqlDatabase(new D1DataProvider(new D1BindingClient(d1)));
}
export class D1DataProvider extends SqliteCoreDataProvider {
    d1;
    /**
     * For production or local d1 using binding
     *
     * const dataProvider = new SqlDatabase(new D1DataProvider(new D1BindingClient(d1)))
     */
    constructor(d1) {
        super(() => new D1Command(this.d1), async () => {
            // afaik: d1 connection doesn't need closing,
            // so this is just a noop
        });
        this.d1 = d1;
    }
    async transaction(action) {
        // As of June 2025, D1 doesn't support transactions
        // Here we simply run the action without wrapping it in a transaction
        // It means queries in action() will be run individually (this is the same decision prisma made)
        await action(this);
    }
}
export class D1BindingClient {
    d1;
    /**
     * Simple d1 client that wraps the d1 binding directly
     *
     * const d1 = new D1BindingClient(env.DB)
     */
    constructor(d1) {
        this.d1 = d1;
    }
    async execute(sql, params = []) {
        // https://developers.cloudflare.com/d1/worker-api/d1-database/
        // https://developers.cloudflare.com/d1/worker-api/prepared-statements/
        //
        // Note: see if we should eventually take advantage of the raw() end point too.
        const { results } = await this.d1
            .prepare(sql)
            .bind(...params)
            .run();
        return results;
    }
}
class D1Command {
    d1;
    params = [];
    constructor(d1) {
        this.d1 = d1;
    }
    async execute(sql) {
        const results = await this.d1.execute(sql, this.params);
        return new D1SqlResult(results);
    }
    /** @deprecated use `param` instead*/
    addParameterAndReturnSqlToken(val) {
        return this.param(val);
    }
    param(val) {
        let p;
        if (val instanceof Date)
            p = val.valueOf();
        else if (typeof val === 'boolean')
            p = val ? 1 : 0;
        else
            p = val;
        this.params.push(p);
        // According to https://developers.cloudflare.com/d1/worker-api/prepared-statements/
        // only the ordered "?NNN" and anonymous "?" param types are supported (although :AAAA seems to work too)
        const key = `?${this.params.length}`;
        return key;
    }
}
class D1SqlResult {
    rows;
    columns;
    constructor(rows = []) {
        this.rows = rows;
        // NOTE: are we guaranteed that when this is reached, rows is not empty?
        this.columns = rows.length === 0 ? [] : Object.keys(rows[0]);
    }
    getColumnKeyInResultForIndexInSelect(index) {
        return this.columns[index];
    }
}
