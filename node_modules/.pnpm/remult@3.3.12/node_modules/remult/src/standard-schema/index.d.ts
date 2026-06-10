import type { MembersOnly, Repository } from '../../index.js';
import type { StandardSchemaV1 } from './StandardSchemaV1.js';
type OutputType<entityType, fields extends string[]> = fields extends [] ? Partial<entityType> : Pick<entityType, Extract<keyof entityType, fields[number]>>;
interface RemultEntitySchema<entityType, fields extends string[] = []> extends StandardSchemaV1<Partial<entityType>, OutputType<entityType, fields>> {
}
/**
 * Implementation of the [Standard Schema](https://standardschema.dev/) specification
 *
 * @example
 * ```ts
 * // The schema for the entire entity
 * const schema = standardSchema(repo(User))
 *
 * // The schema for a specific field
 * const schema = standardSchema(repo(User), 'id')
 *
 * // The schema for multiple fields
 * const schema = standardSchema(repo(User), 'name', 'age')
 * ```
 */
export declare function standardSchema<entityType, fieldsType extends Extract<keyof MembersOnly<entityType>, string>[] = []>(repo: Repository<entityType>, ...fields: fieldsType): RemultEntitySchema<entityType, fieldsType>;
export {};
