<script lang="ts">
	import { marked } from 'marked';

	let { content = '' }: { content?: string } = $props();

	let html = $derived(marked.parse(content, { async: false, breaks: true, gfm: true }) as string);
</script>

<div class="markdown-content">
	{@html html}
</div>

<style>
	.markdown-content {
		overflow-wrap: break-word;
		:global(p) {
			margin: 0.25em 0;
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
		:global(code) {
			padding: 0.125em 0.375em;
			border-radius: 0.25rem;
			font-size: 0.8125em;
			background: oklch(0.15 0.01 170);
		}
		:global(pre) {
			margin: 0.5em 0;
			padding: 0.75rem;
			border-radius: 0.5rem;
			overflow-x: auto;
			font-size: 0.8125em;
			line-height: 1.5;
			background: oklch(0.12 0.008 170);
		}
		:global(pre code) {
			padding: 0;
			background: none;
		}
		:global(ul),
		:global(ol) {
			margin: 0.25em 0;
			padding-left: 1.25em;
		}
		:global(li) {
			margin: 0.125em 0;
		}
		:global(h1),
		:global(h2),
		:global(h3),
		:global(h4) {
			margin: 0.5em 0 0.25em;
			font-weight: 600;
			line-height: 1.3;
		}
		:global(h1) {
			font-size: 1.25em;
		}
		:global(h2) {
			font-size: 1.1em;
		}
		:global(h3) {
			font-size: 1em;
		}
		:global(blockquote) {
			margin: 0.5em 0;
			padding-left: 0.75em;
			border-left: 3px solid oklch(0.5 0.08 185 / 0.3);
			color: oklch(0.6 0.03 170);
		}
		:global(a) {
			color: oklch(0.65 0.12 185);
			text-decoration: underline;
		}
		:global(table) {
			display: block;
			width: 100%;
			overflow-x: auto;
			border-collapse: collapse;
			margin: 0.5em 0;
			font-size: 0.875em;
		}
		:global(th),
		:global(td) {
			padding: 0.375em 0.5em;
			border: 1px solid oklch(0.5 0.08 185 / 0.2);
			text-align: left;
		}
		:global(th) {
			font-weight: 600;
			background: oklch(0.15 0.01 170);
		}
		:global(hr) {
			margin: 0.75em 0;
			border: none;
			border-top: 1px solid oklch(0.5 0.08 185 / 0.2);
		}
	}
</style>
