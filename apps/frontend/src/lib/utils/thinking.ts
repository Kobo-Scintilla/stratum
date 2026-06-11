export interface ParsedBlock {
	type: 'think' | 'text';
	text: string;
}

const START = '<|THINK_START|>';
const END = '<|THINK_END|>';
const LEGACY_START = '<think>';
const LEGACY_END = '</think>';

/**
 * Parse content into thinking/text blocks.
 */
export function parseThinking(content: string): ParsedBlock[] {
	if (!content) return [];
	const blocks: ParsedBlock[] = [];

	// Normalise legacy delimiters to new format
	let normalised = content
		.replace(new RegExp(LEGACY_START, 'g'), START)
		.replace(new RegExp(LEGACY_END, 'g'), END);

	while (normalised.length > 0) {
		const thinkStart = normalised.indexOf(START);
		if (thinkStart === -1) {
			const cleanText = normalised
				.replace(new RegExp(END, 'g'), '')
				.replace(new RegExp(LEGACY_END, 'g'), '');
			if (cleanText) {
				blocks.push({ type: 'text', text: cleanText });
			}
			break;
		}

		// Text before the think block
		if (thinkStart > 0) {
			const before = normalised.substring(0, thinkStart);
			const cleanBefore = before
				.replace(new RegExp(END, 'g'), '')
				.replace(new RegExp(LEGACY_END, 'g'), '');
			if (cleanBefore.trim()) {
				blocks.push({ type: 'text', text: cleanBefore });
			}
		}

		const thinkEnd = normalised.indexOf(END, thinkStart + START.length);
		if (thinkEnd === -1) {
			// Unclosed think — mid-stream, render everything as think block
			const thought = normalised.substring(thinkStart + START.length);
			if (thought.trim()) {
				blocks.push({ type: 'think', text: thought });
			} else {
				// Empty during initial thinking_start — show a minimal block
				blocks.push({ type: 'think', text: '…' });
			}
			break;
		}

		const thought = normalised.substring(thinkStart + START.length, thinkEnd);
		if (thought.trim()) {
			blocks.push({ type: 'think', text: thought });
		}

		normalised = normalised.substring(thinkEnd + END.length);
	}

	return blocks;
}

/**
 * Parse active stream segments into a timeline of activities and the current text.
 */
export function parseStreamSegments(segments: any[]): { activities: any[]; content: string } {
	const activities: any[] = [];
	let content = '';

	for (const seg of segments) {
		if (seg.type === 'text') {
			const blocks = parseThinking(seg.text);
			for (const block of blocks) {
				if (block.type === 'think') {
					activities.push({
						id: crypto.randomUUID(),
						type: 'think',
						text: block.text
					});
				} else if (block.type === 'text') {
					content = block.text;
				}
			}
		} else if (seg.type === 'tool') {
			// If we had accumulated some content text before this tool call, it's intermediate text
			if (content && content.trim() !== '') {
				activities.push({
					id: crypto.randomUUID(),
					type: 'info',
					text: content
				});
				content = '';
			}
			activities.push({
				id: seg.toolCallId,
				type: 'tool',
				name: seg.toolName,
				args: seg.args,
				result:
					seg.result !== undefined
						? {
								result:
									typeof seg.result === 'string' ? seg.result : JSON.stringify(seg.result, null, 2),
								isError: seg.isError ?? false
							}
						: null,
				isError: seg.isError
			});
		}
	}

	return { activities, content };
}
