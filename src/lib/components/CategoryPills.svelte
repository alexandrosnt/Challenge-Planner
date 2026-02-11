<script>
    import { dragscroll } from '$lib/actions/dragscroll';
    let { categories, selected = 0, onSelect = undefined, itemCounts = {} } = $props();
</script>

<div class="category-scroll" use:dragscroll>
    {#each categories as cat (cat.id)}
        <button
            class="cat-pill"
            class:active={selected === cat.id}
            onclick={() => onSelect?.(cat.id)}
        >
            <i class={cat.icon}></i>
            <span>{cat.name}</span>
            {#if itemCounts[cat.id] != null}
                <span class="count-badge">{itemCounts[cat.id]}</span>
            {/if}
        </button>
    {/each}
</div>

<style>
    .category-scroll {
        display: flex;
        gap: 15px;
        overflow-x: auto;
        padding-bottom: 10px;
        margin: 0 -24px 20px -24px;
        padding: 0 24px 10px 24px;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .category-scroll::-webkit-scrollbar {
        display: none;
    }

    .cat-pill {
        background: white;
        padding: 12px 20px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
        white-space: nowrap;
        border: 1px solid rgba(0, 0, 0, 0.02);
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        transition: 0.2s;
        flex-shrink: 0;
    }
    .cat-pill.active {
        background: var(--accent-pink);
        color: white;
        border-color: var(--accent-pink);
    }
    .cat-pill.active i { color: white; }
    .cat-pill i {
        color: var(--accent-pink);
        font-size: 18px;
    }
    .cat-pill span {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-dark);
    }
    .cat-pill.active span { color: white; }
    .count-badge {
        font-size: 11px;
        font-weight: 700;
        background: rgba(0,0,0,0.08);
        padding: 2px 7px;
        border-radius: 10px;
        min-width: 20px;
        text-align: center;
    }
    .cat-pill.active .count-badge {
        background: rgba(255,255,255,0.3);
        color: white;
    }
</style>
