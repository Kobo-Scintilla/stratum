export interface ParsedBlock {
	type: 'think' | 'text';
	text: string;
}

export function parseThinking(content: string): ParsedBlock[] {
	if (!content) return [];
	const blocks: ParsedBlock[] = [];
	let remaining = content;

	while (remaining.length > 0) {
		const thinkStart = remaining.indexOf('<think>');
		if (thinkStart === -1) {
			blocks.push({ type: 'text', text: remaining });
			break;
		}

		if (thinkStart > 0) {
			blocks.push({ type: 'text', text: remaining.substring(0, thinkStart) });
		}

		const thinkEnd = remaining.indexOf('</think>', thinkStart + 7);
		if (thinkEnd === -1) {
			blocks.push({ type: 'think', text: remaining.substring(thinkStart + 7) });
			break;
		}

		blocks.push({ type: 'think', text: remaining.substring(thinkStart + 7, thinkEnd) });
		remaining = remaining.substring(thinkEnd + 8);
	}

	return blocks;
}
