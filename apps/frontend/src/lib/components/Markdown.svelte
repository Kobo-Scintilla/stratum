<script lang="ts">
	import { marked } from 'marked';
	import Prism from 'prismjs';

	// Load Prism Tomorrow theme
	import 'prismjs/themes/prism-tomorrow.css';

	// Load common language grammars
	import 'prismjs/components/prism-typescript.js';
	import 'prismjs/components/prism-python.js';
	import 'prismjs/components/prism-json.js';
	import 'prismjs/components/prism-bash.js';
	import 'prismjs/components/prism-markdown.js';
	import 'prismjs/components/prism-yaml.js';
	import 'prismjs/components/prism-sql.js';
	import 'prismjs/components/prism-rust.js';
	import 'prismjs/components/prism-go.js';

	let { content = '' }: { content?: string } = $props();

	let html = $derived(marked.parse(content, { async: false, breaks: true, gfm: true }) as string);
	let containerRef = $state<HTMLDivElement | null>(null);

	$effect(() => {
		// Re-run highlighting when html changes
		if (html && containerRef) {
			const preElements = containerRef.querySelectorAll('pre');
			preElements.forEach((pre) => {
				const codeEl = pre.querySelector('code');
				if (!codeEl) return;

				// Add syntax highlighting via Prism
				if (!codeEl.dataset.highlighted) {
					Prism.highlightElement(codeEl);
					codeEl.dataset.highlighted = 'true';
				}

				// Add copy button & language header if not present
				if (!pre.querySelector('.code-header-bar')) {
					const langClass = Array.from(codeEl.classList).find((c) => c.startsWith('language-'));
					const lang = langClass ? langClass.replace('language-', '') : 'code';

					pre.style.position = 'relative';
					pre.style.paddingTop = '2.5rem';

					const header = document.createElement('div');
					header.className = 'code-header-bar';
					header.innerHTML = `
						<span class="code-lang">${lang}</span>
						<button class="code-copy-btn" type="button">Copy</button>
					`;

					const copyBtn = header.querySelector('.code-copy-btn') as HTMLButtonElement;
					copyBtn.onclick = () => {
						const textToCopy = codeEl.innerText;
						navigator.clipboard.writeText(textToCopy).then(() => {
							copyBtn.innerText = 'Copied!';
							copyBtn.classList.add('copied');
							setTimeout(() => {
								copyBtn.innerText = 'Copy';
								copyBtn.classList.remove('copied');
							}, 2000);
						});
					};

					pre.insertBefore(header, pre.firstChild);
				}
			});
		}
	});
</script>

<div class="markdown-content" bind:this={containerRef}>
	{@html html}
</div>

<style>
	.markdown-content {
		overflow-wrap: break-word;

		/* Paragraph spacing */
		:global(p) {
			margin: 0.5em 0;
			line-height: 1.6;
			&:first-child {
				margin-top: 0;
			}
			&:last-child {
				margin-bottom: 0;
			}
		}
		:global(p:empty) {
			display: none;
		}

		/* Inline code styling */
		:global(code) {
			padding: 0.15em 0.4em;
			border-radius: 0.25rem;
			font-size: 0.85em;
			font-family: var(--font-mono, monospace);
			background: var(--muted);
			color: var(--foreground);
		}

		/* Code blocks styling */
		:global(pre) {
			position: relative;
			margin: 0.75rem 0;
			padding: 2.75rem 0.875rem 0.875rem; /* extra top padding for the header bar */
			border-radius: 0.75rem;
			overflow-x: auto;
			font-size: 0.825em;
			line-height: 1.5;
			background: oklch(0.05 0.005 260) !important; /* deep rich slate dark */
			border: 1px solid var(--border);
		}

		:global(pre code) {
			padding: 0;
			background: none !important;
			font-family: var(--font-mono, monospace) !important;
		}

		/* Custom Code Header Bar */
		:global(.code-header-bar) {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			height: 2.25rem;
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 0.875rem;
			background: rgba(0, 0, 0, 0.35);
			border-bottom: 1px solid var(--border);
			border-top-left-radius: 0.75rem;
			border-top-right-radius: 0.75rem;
			font-family: var(--font-sans, sans-serif);
			font-size: 0.75rem;
			user-select: none;
		}

		:global(.code-lang) {
			color: var(--muted-foreground);
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		:global(.code-copy-btn) {
			cursor: pointer;
			background: transparent;
			border: none;
			color: var(--primary);
			font-weight: 600;
			transition: all 0.2s ease;
			padding: 0.125rem 0.5rem;
			border-radius: 0.25rem;
			&:hover {
				background: rgba(255, 255, 255, 0.05);
			}
			&:active {
				transform: scale(0.95);
			}
		}

		:global(.code-copy-btn.copied) {
			color: #10b981; /* green success color */
		}

		/* Headings */
		:global(h1),
		:global(h2),
		:global(h3),
		:global(h4) {
			margin: 1rem 0 0.5rem;
			font-weight: 600;
			line-height: 1.3;
			color: var(--foreground);
		}
		:global(h1) {
			font-size: 1.35em;
		}
		:global(h2) {
			font-size: 1.2em;
		}
		:global(h3) {
			font-size: 1.1em;
		}

		/* Lists */
		:global(ul),
		:global(ol) {
			margin: 0.5rem 0;
			padding-left: 1.5rem;
			line-height: 1.6;
		}
		:global(li) {
			margin: 0.25rem 0;
		}

		/* Blockquotes */
		:global(blockquote) {
			margin: 1rem 0;
			padding: 0.75rem 1rem;
			border-left: 4px solid var(--primary);
			background: rgba(255, 255, 255, 0.015);
			border-radius: 0.375rem;
			color: var(--muted-foreground);
			font-style: italic;
		}

		/* Tables */
		:global(table) {
			display: table;
			width: 100%;
			border-collapse: separate;
			border-spacing: 0;
			margin: 1rem 0;
			font-size: 0.85em;
			border-radius: 0.5rem;
			overflow: hidden;
			border: 1px solid var(--border);
		}
		:global(th),
		:global(td) {
			padding: 0.625rem 0.875rem;
			border-bottom: 1px solid var(--border);
			text-align: left;
		}
		:global(tr:last-child td) {
			border-bottom: none;
		}
		:global(th) {
			font-weight: 600;
			background: rgba(0, 0, 0, 0.15);
			color: var(--foreground);
		}
		:global(tr:nth-child(even)) {
			background: rgba(255, 255, 255, 0.01);
		}

		/* Horizontal Rules */
		:global(hr) {
			margin: 1rem 0;
			border: none;
			border-top: 1px solid var(--border);
		}
	}
</style>
