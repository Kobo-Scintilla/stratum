/**
 * Portal action — teleports an element to document.body.
 */
export function portal(node: HTMLElement) {
	node.setAttribute('data-portaled', '');
	document.body.appendChild(node);

	return {
		destroy() {
			if (node.parentNode) node.parentNode.removeChild(node);
		}
	};
}
