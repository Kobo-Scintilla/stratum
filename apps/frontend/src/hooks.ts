import { repo, type ClassType } from 'remult';
import { ActiveStream } from '@stratum/shared/entities/active-stream.js';
import { ChatMessage } from '@stratum/shared/entities/chat-message.js';
import { ProviderSetting } from '@stratum/shared/entities/provider-setting.js';
import { ChatSessionSettings } from '@stratum/shared/entities/chat-session-settings.js';
import type { Transport } from '@sveltejs/kit';

const ENTITIES = [ActiveStream, ChatMessage, ProviderSetting, ChatSessionSettings] as const;
type EntityClass = (typeof ENTITIES)[number];

function repoFor(e: EntityClass) {
	return repo(e as ClassType<unknown>);
}

export const transport: Transport = {
	remultTransport: {
		encode(value: unknown) {
			for (const entity of ENTITIES) {
				if (value instanceof entity) {
					const r = repoFor(entity);
					return { ...r.toJson(value), entity_key: r.metadata.key };
				}
			}
		},
		decode(value: Record<string, unknown>) {
			for (const entity of ENTITIES) {
				const r = repoFor(entity);
				if (value.entity_key === r.metadata.key) {
					return r.fromJson(value as Record<string, unknown>);
				}
			}
		}
	}
};
