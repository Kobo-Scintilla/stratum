import { j as remultStatic, z as setControllerSettings, A as entityInfo, B as entityInfo_key, D as getEntitySettings, q as Fields } from './IdEntity-Le34BexZ.js';

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
function Entity(key, ...options) {
    return (target, info) => {
        let theClass = target;
        while (theClass != null) {
            for (const rawFilterMember in theClass) {
                if (Object.prototype.hasOwnProperty.call(theClass, rawFilterMember)) {
                    const element = target[rawFilterMember];
                    if (element?.rawFilterInfo) {
                        if (!element.rawFilterInfo.key)
                            element.rawFilterInfo.key = rawFilterMember;
                    }
                }
            }
            theClass = Object.getPrototypeOf(theClass);
        }
        let factory = (remult) => {
            let r = {};
            for (const o of options) {
                if (o) {
                    if (typeof o === 'function')
                        o(r, remult);
                    else
                        Object.assign(r, o);
                }
            }
            let base = Object.getPrototypeOf(target);
            if (base) {
                let baseFactory = getEntitySettings(base, false);
                if (baseFactory) {
                    let opt = baseFactory(remult);
                    if (opt) {
                        r = {
                            ...opt,
                            ...r,
                        };
                    }
                }
            }
            return r;
        };
        remultStatic.allEntities.push(target);
        setControllerSettings(target, { key });
        target[entityInfo] = factory;
        target[entityInfo_key] = key;
        return target;
    };
}

//#region \0@oxc-project+runtime@0.133.0/helpers/esm/decorate.js
function __decorate(decorators, target, key, desc) {
	var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
	if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
	else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
	return c > 3 && r && Object.defineProperty(target, key, r), r;
}
//#endregion
//#region src/lib/shared/entities/chat-message.ts
var ChatMessage = class ChatMessage {
	id;
	sessionId = "default";
	role = "user";
	content = "";
	toolCalls;
	toolCallId;
	toolName;
	toolResult;
	isError = false;
	sortOrder = 0;
	createdAt = /* @__PURE__ */ new Date();
};
__decorate([Fields.id()], ChatMessage.prototype, "id", void 0);
__decorate([Fields.string()], ChatMessage.prototype, "sessionId", void 0);
__decorate([Fields.string()], ChatMessage.prototype, "role", void 0);
__decorate([Fields.string()], ChatMessage.prototype, "content", void 0);
__decorate([Fields.object()], ChatMessage.prototype, "toolCalls", void 0);
__decorate([Fields.string()], ChatMessage.prototype, "toolCallId", void 0);
__decorate([Fields.string()], ChatMessage.prototype, "toolName", void 0);
__decorate([Fields.object()], ChatMessage.prototype, "toolResult", void 0);
__decorate([Fields.boolean()], ChatMessage.prototype, "isError", void 0);
__decorate([Fields.integer()], ChatMessage.prototype, "sortOrder", void 0);
__decorate([Fields.date()], ChatMessage.prototype, "createdAt", void 0);
ChatMessage = __decorate([Entity("chatMessages", { allowApiCrud: true })], ChatMessage);

export { ChatMessage as C, Entity as E, __decorate as _ };
//# sourceMappingURL=chat-message-CwAUUCQ1.js.map
