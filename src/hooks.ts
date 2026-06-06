import { repo, type ClassType } from 'remult';
import { ActiveStream } from '$lib/shared/entities/active-stream';
import { ChatMessage } from '$lib/shared/entities/chat-message';
import type { Transport } from '@sveltejs/kit';

const ENTITIES = [ActiveStream, ChatMessage] as const;
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
