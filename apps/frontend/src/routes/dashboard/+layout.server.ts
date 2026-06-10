import { remult } from 'remult';

export async function load() {
	const res = await fetch('http://localhost:3001/api/listSessions');
	const sessions = await res.json();
	return { sessions };
}
