<script lang="ts">
    import { setLocale } from '$lib/i18n/index.svelte';

    let { onSelect } = $props();

    function selectLanguage(lang: string) {
        setLocale(lang);
        onSelect();
    }
</script>

<div class="overlay">
    <div class="card">
        <div class="brand">
            <i class="ri-heart-3-fill brand-icon"></i>
            <h1 class="brand-name">Use Up | Premium</h1>
        </div>

        <p class="subtitle">Choose your language</p>

        <div class="lang-row">
            <button class="lang-card" onclick={() => selectLanguage('en')}>
                <span class="lang-label">English</span>
            </button>
            <button class="lang-card" onclick={() => selectLanguage('de')}>
                <span class="lang-label">Deutsch</span>
            </button>
        </div>
    </div>
</div>

<style>
    .overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fdfbf7;
        background-image:
            radial-gradient(ellipse at 20% 50%, rgba(255, 154, 158, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 50%, rgba(254, 207, 239, 0.15) 0%, transparent 50%);
        padding: 24px;
        font-family: 'Poppins', sans-serif;
    }

    .card {
        background: var(--glass-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-l);
        box-shadow: var(--glass-shadow);
        padding: 40px 28px 36px;
        width: 100%;
        max-width: 380px;
        text-align: center;
    }

    .brand {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        margin-bottom: 24px;
    }

    .brand-icon {
        font-size: 36px;
        background: var(--primary-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .brand-name {
        font-size: 20px;
        font-weight: 700;
        color: var(--text-dark);
        margin: 0;
        letter-spacing: -0.3px;
    }

    .subtitle {
        font-size: 15px;
        color: var(--text-soft);
        margin: 0 0 28px;
    }

    .lang-row {
        display: flex;
        gap: 14px;
    }

    .lang-card {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100px;
        background: var(--glass-bg);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-m);
        box-shadow: var(--glass-shadow);
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                    box-shadow 0.2s ease;
        padding: 20px 12px;
        font-family: 'Poppins', sans-serif;
    }

    .lang-card:active {
        transform: scale(0.95);
        box-shadow: 0 4px 16px 0 rgba(31, 38, 135, 0.12);
    }

    .lang-label {
        font-size: 17px;
        font-weight: 600;
        color: var(--text-dark);
    }
</style>
