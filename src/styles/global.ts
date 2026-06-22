import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
    *, ::before, ::after {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    /* ============================================================
       CHEKKA — Premium Concierge Design Tokens
       Aesthetic: warm near-black, cream, restrained antique gold
       ============================================================ */
    :root,
    [data-theme="dark"] {
        /* Surfaces — warm graphite */
        --bg:                #0E0D0A;
        --bg-tint:           #15130E;
        --surface:           #1A1813;
        --surface-2:         #221F18;
        --surface-3:         #2C2920;
        --hairline:          rgba(201, 169, 97, 0.16);
        --hairline-strong:   rgba(201, 169, 97, 0.32);
        --divider:           rgba(245, 241, 232, 0.08);

        /* Ink — cream on graphite */
        --ink:               #F5F1E8;
        --ink-soft:          #D8D1BF;
        --ink-muted:         #918A78;
        --ink-faint:         #5E5847;

        /* Accent — antique gold */
        --gold:              #C9A961;
        --gold-bright:       #E8C77B;
        --gold-deep:         #8C7339;
        --gold-wash:         rgba(201, 169, 97, 0.10);
        --gold-wash-2:       rgba(201, 169, 97, 0.22);

        /* Verdict colors */
        --good:              #7CA982;
        --good-deep:         #3E5E45;
        --good-wash:         rgba(124, 169, 130, 0.14);
        --caution:           #D4A24C;
        --caution-deep:      #7A5C20;
        --caution-wash:      rgba(212, 162, 76, 0.14);
        --danger:            #C26B5E;
        --danger-deep:       #74332A;
        --danger-wash:       rgba(194, 107, 94, 0.14);

        /* Status pills */
        --info-wash:         rgba(140, 168, 196, 0.16);
        --info:              #8CA8C4;

        /* Typography */
        --display:           "Instrument Serif", "Cormorant Garamond", Georgia, serif;
        --sans:              "DM Sans", "Geist", "Söhne", "Helvetica Neue", system-ui, sans-serif;
        --mono:              "Geist Mono", "JetBrains Mono", ui-monospace, monospace;

        /* Radii */
        --r-xs: 4px;
        --r-sm: 8px;
        --r-md: 14px;
        --r-lg: 22px;
        --r-xl: 32px;
        --r-pill: 999px;

        /* Shadows */
        --shadow-1: 0 1px 0 rgba(255, 240, 200, 0.04) inset, 0 4px 14px rgba(0, 0, 0, 0.4);
        --shadow-2: 0 1px 0 rgba(255, 240, 200, 0.05) inset, 0 24px 50px rgba(0, 0, 0, 0.55);
        --shadow-gold: 0 0 0 1px rgba(201, 169, 97, 0.4), 0 12px 40px rgba(201, 169, 97, 0.18);
    }

    /* Light mode override */
    [data-theme="light"] {
        --bg:                #F8F5EC;
        --bg-tint:           #F2EEE2;
        --surface:           #FFFFFF;
        --surface-2:         #FBF8EE;
        --surface-3:         #F2EEE2;
        --hairline:          rgba(140, 115, 57, 0.18);
        --hairline-strong:   rgba(140, 115, 57, 0.32);
        --divider:           rgba(20, 18, 12, 0.08);

        --ink:               #1A1813;
        --ink-soft:          #2C2920;
        --ink-muted:         #6E6754;
        --ink-faint:         #A39E91;

        --gold:              #8C7339;
        --gold-bright:       #B8964B;
        --gold-deep:         #5E4D26;
        --gold-wash:         rgba(140, 115, 57, 0.10);
        --gold-wash-2:       rgba(140, 115, 57, 0.18);

        --shadow-1: 0 1px 2px rgba(60, 50, 24, 0.06), 0 4px 14px rgba(60, 50, 24, 0.06);
        --shadow-2: 0 12px 32px rgba(60, 50, 24, 0.12);
    }

    html {
        min-height: 100vh;
    }

    body {
        margin: 0 auto;
        font-family: var(--sans);
        background: var(--bg);
        color: var(--ink);
        font-size: 14px;
        line-height: 1.5;
        letter-spacing: -0.005em;
        font-optical-sizing: auto;
        -webkit-font-smoothing: antialiased;
        font-feature-settings: "ss01", "cv11";
        overflow-x: hidden;
        transition: background 0.2s ease, color 0.2s ease;
    }

    button {
        font-family: inherit;
        border: none;
        outline: none;
        cursor: pointer;
    }

    a {
        text-decoration: none;
        color: inherit;

        &:hover {
            color: inherit;
        }
    }

    img {
        border-style: none;
        overflow-clip-margin: content-box;
        overflow: clip;
    }

    input, input:focus, input:hover,
    textarea, textarea:focus, textarea:hover {
        outline: none;
    }

    ul, li {
        text-decoration: none;
        list-style: none;
    }

    /* Display family */
    h1, h2, h3 {
        font-family: var(--display);
        font-weight: 400;
        letter-spacing: -0.02em;
        line-height: 1.05;
        margin: 0;
    }

    /* Scrollbar */
    body,
    .scrollbar,
    .scrollbar-transparent {
        &::-webkit-scrollbar { width: 10px; height: 10px; }
        &::-webkit-scrollbar-track { background: transparent; }
        &::-webkit-scrollbar-thumb {
            background: var(--surface-3);
            border-radius: 8px;
            border: 2px solid transparent;
            background-clip: content-box;
        }
        &::-webkit-scrollbar-thumb:hover {
            background: var(--gold-deep);
            background-clip: content-box;
            border: 2px solid transparent;
        }
    }

    .scrollbar-transparent {
        &::-webkit-scrollbar-thumb,
        &::-webkit-scrollbar-track {
            background: transparent;
        }
    }

    ::selection {
        background: var(--gold-wash-2);
        color: var(--ink);
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.4; }
    }

    @keyframes fadeUp {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: none; }
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

export default GlobalStyle;
