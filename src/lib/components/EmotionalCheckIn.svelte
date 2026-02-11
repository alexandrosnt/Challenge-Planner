<script>
    let { onSelect, onSkip } = $props();

    const feelings = [
        { value: 'happy', emoji: '\u{1F60A}', label: 'Happy' },
        { value: 'neutral', emoji: '\u{1F610}', label: 'Neutral' },
        { value: 'guilty', emoji: '\u{1F614}', label: 'Guilty' },
        { value: 'impulsive', emoji: '\u{1F525}', label: 'Impulsive' },
        { value: 'needed', emoji: '\u{2705}', label: 'Needed' },
    ];
</script>

<div class="checkin-overlay" role="dialog" aria-label="Emotional check-in">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="checkin-backdrop" onclick={onSkip} role="presentation"></div>
    <div class="checkin-card">
        <h3 class="checkin-title">How do you feel about this purchase?</h3>
        <div class="feelings-row">
            {#each feelings as f (f.value)}
                <button class="feeling-btn" onclick={() => onSelect(f.value)}>
                    <span class="feeling-emoji">{f.emoji}</span>
                    <span class="feeling-label">{f.label}</span>
                </button>
            {/each}
        </div>
        <button class="skip-btn" onclick={onSkip}>Skip</button>
    </div>
</div>

<style>
    .checkin-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        z-index: 250; display: flex; align-items: center; justify-content: center;
    }
    .checkin-backdrop {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);
    }
    .checkin-card {
        position: relative; z-index: 1;
        background: white; border-radius: var(--radius-l);
        padding: 30px 24px; margin: 0 24px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        text-align: center;
    }
    .checkin-title {
        font-size: 16px; font-weight: 600; margin-bottom: 24px;
        color: var(--text-dark);
    }
    .feelings-row {
        display: flex; justify-content: space-around; gap: 8px; margin-bottom: 20px;
    }
    .feeling-btn {
        background: none; border: none; cursor: pointer;
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        padding: 10px 8px; border-radius: var(--radius-s);
        transition: 0.2s;
    }
    .feeling-btn:active { transform: scale(0.9); background: #FFF0F3; }
    .feeling-emoji { font-size: 32px; }
    .feeling-label { font-size: 11px; font-weight: 600; color: var(--text-soft); }
    .skip-btn {
        background: none; border: none; cursor: pointer;
        font-family: 'Poppins', sans-serif;
        font-size: 14px; font-weight: 500; color: var(--text-soft);
    }
    .skip-btn:active { color: var(--text-dark); }
</style>
