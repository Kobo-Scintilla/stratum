import { RestDataProvider } from '../index.js';
import type { RemultServerOptions } from './index.js';
export declare function TestApiDataProvider(options?: Pick<RemultServerOptions<unknown>, 'ensureSchema' | 'dataProvider'>): RestDataProvider;
export declare class AsyncLock {
    static enabled: boolean;
    private current;
    i: number;
    runExclusive<T>(fn: () => Promise<T>): Promise<T>;
}
