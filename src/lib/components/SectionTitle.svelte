<script>
    import { t } from '$lib/i18n/index.svelte';

    let { title, actionText = t.common.seeAll, onAction = undefined } = $props();
</script>

<div class="section-title">
    <span>{title}</span>
    {#if onAction}
        <button class="see-all" onclick={onAction}>{actionText}</button>
    {:else}
        <span class="see-all">{actionText}</span>
    {/if}
</div>

<style>
    .section-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .see-all {
        font-size: 13px;
        color: var(--accent-pink);
        font-weight: 600;
        background: none;
        border: none;
        cursor: pointer;
    }
</style>
