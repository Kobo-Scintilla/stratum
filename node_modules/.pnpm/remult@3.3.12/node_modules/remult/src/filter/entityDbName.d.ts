import type { EntityMetadata } from '../remult3/remult3.js';
export declare function entityDbName(metadata: EntityMetadata, wrapIdentifier?: (name: string) => string): Promise<string>;
