let addModalOpen = $state(false);

export function getModalState() {
	return {
		get open() { return addModalOpen; }
	};
}

export function openAddModal(): void {
	addModalOpen = true;
}

export function closeAddModal(): void {
	addModalOpen = false;
}
