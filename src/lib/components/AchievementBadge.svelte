<script>
    let { achievement } = $props();
</script>

<div class="achievement" class:unlocked={achievement.unlocked}>
    <div class="badge">
        {#if achievement.unlocked}
            <i class={achievement.icon}></i>
        {:else}
            <i class="ri-lock-line"></i>
        {/if}
    </div>
    <span class="title">{achievement.title}</span>
    {#if achievement.unlocked && achievement.unlocked_at}
        <span class="date">{new Date(achievement.unlocked_at).toLocaleDateString()}</span>
    {/if}
</div>

<style>
    .achievement {
        text-align: center;
    }
    .badge {
        width: 60px; height: 60px; margin: 0 auto 8px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 24px;
        background: #f0f0f0;
        color: #ccc;
        transition: 0.3s;
    }
    .unlocked .badge {
        background: var(--primary-gradient);
        color: white;
        box-shadow: 0 4px 20px rgba(255, 107, 129, 0.35);
    }
    .title {
        font-size: 11px; font-weight: 600; color: var(--text-dark);
        display: block;
    }
    .achievement:not(.unlocked) .title {
        color: var(--text-soft);
    }
    .date {
        font-size: 10px; color: var(--text-soft); display: block;
    }
</style>
