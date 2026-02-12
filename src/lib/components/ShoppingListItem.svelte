<script lang="ts">
    interface ShoppingItem {
        id: number;
        name: string;
        quantity: number;
        checked: number;
        notes: string | null;
    }

    interface Props {
        item: ShoppingItem;
        onToggle?: (id: number) => void;
        onDelete?: (id: number) => void;
        onEdit?: (id: number) => void;
    }

    let { item, onToggle, onDelete, onEdit }: Props = $props();

    let isChecked = $derived(item.checked === 1);
</script>

<div class="shopping-row" class:checked={isChecked}>
    <button class="checkbox-area" onclick={() => onToggle?.(item.id)} aria-label="Toggle {item.name}">
        <span class="checkbox" class:checked={isChecked}>
            {#if isChecked}
                <i class="ri-check-line"></i>
            {/if}
        </span>
    </button>

    <div class="item-content">
        <div class="item-top">
            <span class="item-name" class:checked={isChecked}>{item.name}</span>
            {#if item.quantity > 1}
                <span class="quantity-badge">&times;{item.quantity}</span>
            {/if}
        </div>
        {#if item.notes}
            <span class="item-notes">{item.notes}</span>
        {/if}
    </div>

    {#if onEdit}
        <button class="delete-btn" onclick={() => onEdit?.(item.id)} aria-label="Edit {item.name}">
            <i class="ri-pencil-line"></i>
        </button>
    {/if}
    <button class="delete-btn" onclick={() => onDelete?.(item.id)} aria-label="Delete {item.name}">
        <i class="ri-delete-bin-6-line"></i>
    </button>
</div>

<style>
    .shopping-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 4px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        transition: opacity 0.2s ease;
    }

    .shopping-row.checked {
        opacity: 0.55;
    }

    .checkbox-area {
        flex-shrink: 0;
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
    }

    .checkbox-area:active {
        transform: scale(0.9);
    }

    .checkbox {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 8px;
        border: 2px solid rgba(0, 0, 0, 0.15);
        background: rgba(255, 255, 255, 0.6);
        transition: all 0.2s ease;
        font-size: 14px;
        color: white;
    }

    .checkbox.checked {
        background: var(--accent-sage);
        border-color: var(--accent-sage);
    }

    .item-content {
        flex: 1;
        min-width: 0;
    }

    .item-top {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .item-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary, #2d2d2d);
        transition: all 0.2s ease;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .item-name.checked {
        text-decoration: line-through;
        color: var(--text-soft);
    }

    .quantity-badge {
        flex-shrink: 0;
        font-size: 11px;
        font-weight: 600;
        color: var(--accent-pink);
        background: rgba(255, 107, 129, 0.1);
        padding: 2px 8px;
        border-radius: 50px;
    }

    .item-notes {
        display: block;
        font-size: 12px;
        color: var(--text-soft);
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .delete-btn {
        flex-shrink: 0;
        background: none;
        border: none;
        padding: 6px;
        cursor: pointer;
        color: var(--text-soft);
        font-size: 17px;
        transition: color 0.2s ease;
        -webkit-tap-highlight-color: transparent;
    }

    .delete-btn:active {
        color: var(--accent-pink);
        transform: scale(0.9);
    }
</style>
