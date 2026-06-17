export class Logger {
	readonly namespace: string;

	constructor(namespace: string) {
		this.namespace = namespace;
	}

	debug(...args: unknown[]) {
		console.debug(`[${this.namespace}]`, ...args);
	}

	log(...args: unknown[]) {
		console.log(`[${this.namespace}]`, ...args);
	}

	warn(...args: unknown[]) {
		console.warn(`[${this.namespace}]`, ...args);
	}

	error(...args: unknown[]) {
		console.error(`[${this.namespace}]`, ...args);
	}
}
