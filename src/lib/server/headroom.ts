// Headroom REST API client.
// Calls the Headroom compression proxy at POST /v1/compress.
// The proxy compresses tool_result blocks per-message automatically.

const HEADROOM_URL = process.env.HEADROOM_URL || 'http://headroom:8787';

export interface HeadroomCompressRequest {
	messages: unknown[];
	model: string;
	token_budget?: number;
	config?: {
		compress_user_messages?: boolean;
		compress_system_messages?: boolean;
		target_ratio?: number;
		protect_recent?: number;
		protect_analysis_context?: boolean;
	};
}

export interface HeadroomCompressResponse {
	messages: unknown[];
	tokens_before: number;
	tokens_after: number;
	tokens_saved: number;
	compression_ratio: number;
	transforms_applied: string[];
	transforms_summary: string;
	ccr_hashes: string[];
}

export class HeadroomClient {
	private readonly baseUrl: string;

	constructor(baseUrl: string = HEADROOM_URL) {
		this.baseUrl = baseUrl;
	}

	async compress(request: HeadroomCompressRequest): Promise<HeadroomCompressResponse> {
		const response = await fetch(`${this.baseUrl}/v1/compress`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(request)
		});

		if (!response.ok) {
			const text = await response.text().catch(() => 'unknown error');
			throw new Error(`Headroom compress failed (${response.status}): ${text}`);
		}

		return response.json() as Promise<HeadroomCompressResponse>;
	}
}

export const headroom = new HeadroomClient();
