import { Entity, Fields } from 'remult';

@Entity('flueSessions', {
	allowApiCrud: true
})
export class FlueSession {
	@Fields.id()
	id!: string;

	@Fields.string()
	data = '';

	@Fields.string()
	updatedAt = '';
}
