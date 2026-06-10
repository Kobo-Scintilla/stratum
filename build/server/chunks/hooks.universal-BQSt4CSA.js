import { C as ChatMessage } from './chat-message-CwAUUCQ1.js';
import { A as ActiveStream, P as ProviderSetting, C as ChatSessionSettings } from './chat-session-settings-C_T3OJ8l.js';
import { r as remult } from './IdEntity-Le34BexZ.js';

/**
 * A convenient shortcut function to quickly obtain a repository for a specific entity type in Remult.
 *
 * @param entity The entity class type for which you want to get a repository.
 * @returns A repository instance for the specified entity type.
 *
 * Example usage:
 * ```ts
 * await repo(Task).find()
 * await repo(Customer).insert()
 * ```
 */
function repo(entity, dataProvider) {
    return remult.repo(entity, dataProvider);
}

//#region src/hooks.ts
var ENTITIES = [
	ActiveStream,
	ChatMessage,
	ProviderSetting,
	ChatSessionSettings
];
function repoFor(e) {
	return repo(e);
}
var transport = { remultTransport: {
	encode(value) {
		for (const entity of ENTITIES) if (value instanceof entity) {
			const r = repoFor(entity);
			return {
				...r.toJson(value),
				entity_key: r.metadata.key
			};
		}
	},
	decode(value) {
		for (const entity of ENTITIES) {
			const r = repoFor(entity);
			if (value.entity_key === r.metadata.key) return r.fromJson(value);
		}
	}
} };

export { transport };
//# sourceMappingURL=hooks.universal-BQSt4CSA.js.map
