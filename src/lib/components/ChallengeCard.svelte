<script>
    import GlassCard from '$lib/components/GlassCard.svelte';
    import ProgressBar from '$lib/components/ProgressBar.svelte';
    import ProgressRing from '$lib/components/ProgressRing.svelte';

    let { title, icon, tag = 'Project Pan', completed, total, deadline = null, onIncrement = undefined } = $props();

    let remaining = $derived(total - completed);
    let percentage = $derived(total > 0 ? Math.round((completed / total) * 100) : 0);
    let isComplete = $derived(completed >= total);
</script>

<GlassCard>
    <div class="project-header">
        <div class="project-icon">
            <i class={icon}></i>
        </div>
        <div class="project-info">
            <span class="tag">{tag}</span>
            <h3 class="project-title">{title}</h3>
            {#if deadline}
                <p class="deadline">Deadline: {deadline}</p>
            {/if}
        </div>
        <ProgressRing value={percentage} size={56} strokeWidth={4} />
    </div>
    <div class="progress-info">
        <span>{completed} Used Up</span>
        <span>{remaining} Remaining</span>
    </div>
    <ProgressBar value={percentage} />
    {#if onIncrement && !isComplete}
        <button class="increment-btn" onclick={onIncrement}>
            <i class="ri-add-line"></i> Log Progress
        </button>
    {/if}
    {#if isComplete}
        <div class="complete-badge">Completed!</div>
    {/if}
</GlassCard>

<style>
    .project-header { display: flex; align-items: flex-start; gap: 15px; margin-bottom: 20px; }
    .project-icon {
        width: 50px; height: 50px;
        background: #FFF0F3;
        border-radius: var(--radius-m);
        display: flex; align-items: center; justify-content: center;
        font-size: 24px; color: var(--accent-pink);
        flex-shrink: 0;
    }
    .project-info { flex: 1; }
    .tag { background: #E8F5E9; color: var(--accent-sage); padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .project-title { font-size: 16px; margin-top: 5px; }
    .deadline { font-size: 12px; color: var(--text-soft); margin-top: 2px; }
    .progress-info { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: var(--text-soft); }
    .increment-btn {
        width: 100%; margin-top: 14px; padding: 10px;
        border: 1px solid rgba(0,0,0,0.06); border-radius: 50px;
        background: white; font-family: 'Poppins', sans-serif;
        font-size: 13px; font-weight: 600; color: var(--accent-pink);
        cursor: pointer; display: flex; align-items: center;
        justify-content: center; gap: 6px; transition: 0.2s;
    }
    .increment-btn:active { transform: scale(0.98); background: #FFF0F3; }
    .complete-badge {
        margin-top: 14px; text-align: center;
        padding: 8px; border-radius: 50px;
        background: #E8F5E9; color: var(--accent-sage);
        font-size: 13px; font-weight: 700;
    }
</style>
