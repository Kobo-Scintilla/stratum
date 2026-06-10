import type { ClassType } from '../classType.js';
import type { RemultServerOptions } from './remult-api-server.js';
export interface ModuleInput<RequestType> {
    key: string;
    /** @default 0 */
    priority?: number;
    entities?: ClassType<unknown>[];
    controllers?: ClassType<unknown>[];
    initApi?: RemultServerOptions<RequestType>['initApi'];
    initRequest?: RemultServerOptions<RequestType>['initRequest'];
    modules?: Module<RequestType>[];
}
export declare class Module<RequestType> {
    key: string;
    priority: number;
    entities?: ClassType<unknown>[];
    controllers?: ClassType<unknown>[];
    initApi?: RemultServerOptions<RequestType>['initApi'];
    initRequest?: RemultServerOptions<RequestType>['initRequest'];
    modules?: Module<RequestType>[];
    constructor(options: ModuleInput<RequestType>);
}
/**
 * Full flat and ordered list by index and concatenaining the modules name
 */
export declare const modulesFlatAndOrdered: <RequestType>(modules: Module<RequestType>[]) => Module<RequestType>[];
