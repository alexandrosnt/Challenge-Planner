export type ModalType =
	| 'add-item'
	| 'add-budget'
	| 'add-shopping-item'
	| 'inventory-picker-pan'
	| 'inventory-picker-declutter'
	| null;

let currentModal = $state<ModalType>(null);

export function getModalState() {
	return {
		get current() { return currentModal; },
		get open() { return currentModal !== null; }
	};
}

export function openModal(type: ModalType): void {
	currentModal = type;
}

export function closeModal(): void {
	currentModal = null;
}

// Legacy compat — used by existing code during migration
export function openAddModal(): void {
	openModal('add-item');
}

export function closeAddModal(): void {
	closeModal();
}
