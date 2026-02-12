let counter = $state(0);

export function getRefreshSignal() {
	return {
		get value() { return counter; }
	};
}

export function triggerRefresh() {
	counter++;
}
