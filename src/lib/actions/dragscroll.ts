export function dragscroll(node: HTMLElement) {
	let isDown = false;
	let startX = 0;
	let scrollLeft = 0;

	function onMouseDown(e: MouseEvent) {
		isDown = true;
		node.style.cursor = 'grabbing';
		startX = e.pageX - node.offsetLeft;
		scrollLeft = node.scrollLeft;
	}

	function onMouseUp() {
		isDown = false;
		node.style.cursor = 'grab';
	}

	function onMouseLeave() {
		isDown = false;
		node.style.cursor = 'grab';
	}

	function onMouseMove(e: MouseEvent) {
		if (!isDown) return;
		e.preventDefault();
		const x = e.pageX - node.offsetLeft;
		node.scrollLeft = scrollLeft - (x - startX);
	}

	node.style.cursor = 'grab';
	node.addEventListener('mousedown', onMouseDown);
	node.addEventListener('mouseup', onMouseUp);
	node.addEventListener('mouseleave', onMouseLeave);
	node.addEventListener('mousemove', onMouseMove);

	return {
		destroy() {
			node.removeEventListener('mousedown', onMouseDown);
			node.removeEventListener('mouseup', onMouseUp);
			node.removeEventListener('mouseleave', onMouseLeave);
			node.removeEventListener('mousemove', onMouseMove);
		}
	};
}
