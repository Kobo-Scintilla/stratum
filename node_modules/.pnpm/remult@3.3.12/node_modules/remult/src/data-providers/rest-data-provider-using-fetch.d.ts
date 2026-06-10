import type { RestDataProviderHttpProvider } from '../data-interfaces.js';
export declare class RestDataProviderHttpProviderUsingFetch implements RestDataProviderHttpProvider {
    private fetch?;
    constructor(fetch?: ((input: RequestInfo, init?: RequestInit) => Promise<Response>) | undefined);
    get(url: string): Promise<any>;
    put(url: string, data: any): Promise<any>;
    delete(url: string): Promise<any>;
    post(url: string, data: any): Promise<any>;
    myFetch(url: string, options?: {
        method?: string;
        body?: string;
    }): Promise<any>;
}
