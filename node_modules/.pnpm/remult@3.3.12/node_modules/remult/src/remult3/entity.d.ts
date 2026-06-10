import type { Remult } from '../context.js';
import type { EntityOptions } from '../entity.js';
import type { ClassDecoratorContextStub } from './remult3.js';
/**Decorates classes that should be used as entities.
 * Receives a key and an array of EntityOptions.
 * @example
 * ```ts
 * import  { Entity, Fields } from "remult";
 * @Entity("tasks", {
 *    allowApiCrud: true
 * })
 * export class Task {
 *    @Fields.id()
 *    id!: string;
 *    @Fields.string()
 *    title = '';
 *    @Fields.boolean()
 *    completed = false;
 * }
 * ```
 * EntityOptions can be set in two ways:
 * @example
 * ```ts
 * // as an object
 * @Entity("tasks",{ allowApiCrud:true })
 * ```
 * @example
 * ```ts
 * // as an arrow function that receives `remult` as a parameter
 * @Entity("tasks", (options,remult) => options.allowApiCrud = true)
 * ```
 */
export declare function Entity<entityType>(key: string, ...options: (EntityOptions<entityType extends new (...args: any) => any ? InstanceType<entityType> : entityType> | ((options: EntityOptions<entityType extends new (...args: any) => any ? InstanceType<entityType> : entityType>, remult: Remult) => void))[]): (target: any, info?: ClassDecoratorContextStub<entityType extends new (...args: any) => any ? entityType : never>) => any;
