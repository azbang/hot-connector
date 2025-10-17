export const nearMobileFrame = `
<div class="near-mobile">
    <div class="near-mobile-overlay"></div>
    <div class="near-mobile-card">
        <header>
        </header>

        <section class="near-mobile-logo-section">
            <img src="https://near-mobile-signer-backend_production.peersyst.tech/assets/near-logo.svg" class="near-mobile-logo" />
        </section>

        <div class="near-mobile-layout">
            <div class="near-mobile-qr-section">
                <p style="font-size: 24px;">Connect Wallet</p>
                <div class="near-mobile-qr-wrap">
                    <div id="qr-code" class="near-mobile-qr"></div>
                </div>

                <div class="near-mobile-responsive-layout near-mobile-redirect-visible">
                    <a
                        id="approve-button"
                        class="near-mobile-button near-mobile-redirect-visible"
                        target="_parent"
                        rel="noopener noreferrer"
                    >
                        Sign transaction
                    </a>
                </div>
            </div>

            <footer class="near-mobile-footer">
                <div class="near-mobile-links">
                    <a onclick="window.selector.open('https://apps.apple.com/app/near-mobile/id6443501225')">
                        <div class="near-mobile-link">
                            <img src="https://near-mobile-signer-backend_production.peersyst.tech/assets/ios.svg" />
                            <p>App Store</p>
                        </div>
                    </a>
                    
                    <a class="near-mobile-android" onclick="window.selector.open('https://play.google.com/store/apps/details?id=com.peersyst.nearmobilewallet')">
                        <div class="near-mobile-link">
                            <img src="https://near-mobile-signer-backend_production.peersyst.tech/assets/play-store.svg" />
                            <p>Google Play</p>
                        </div>
                    </a>
                </div>
                <p class="near-mobile-subtitle">
                    Don’t have an account yet?
                    <a onclick="window.selector.open('https://nearmobile.app')">Download the app</a>
                </p>
            </footer>
        </div>
    </div>
</div>
`;

export const nearMobileFrameHead = `
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&display=swap" rel="stylesheet" />
<title>Near Mobile Wallet Signer</title>
<style>
    * {
        font-family: Manrope, sans-serif;
        box-sizing: border-box;
    }

    body {
        margin: 0;
        padding: 0;
    }

    p {
        margin-block: 0;
        font-weight: 600;
        color: #fff;
    }

    a {
        font-family: Manrope;
        font-style: normal;
        font-weight: 600;
        font-size: 1rem;
        line-height: 1.375rem;
        text-decoration: none;
        color: #fff !important;
        padding: 0;
        margin: 0;
    }

    *::-webkit-scrollbar {
        display: none;
    }

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    shader-art {
        display: block;
        width: 100%;
        height: 100%;
    }

    shader-art canvas {
        display: block;
        width: 100%;
        height: 100%;
    }

    header {
        padding: 1.25rem 1.25rem 0rem;
        display: flex;
        height: fit-content;
        width: 100%;
        justify-content: flex-end;
        align-items: flex-end;
    }

    .near-mobile {
        opacity: 1;
        visibility: visible;
        transition: visibility linear, opacity 0.25s;
        justify-content: center;
        align-items: center;
        font-family: Manrope, sans-serif;
        z-index: 10000;
        display: flex;
        min-height: 100%;
        min-width: 100%;
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
    }

    .near-mobile-overlay {
        position: absolute;
        background: rgba(38, 38, 38, 0.6);
        height: 100%;
        width: 100%;
    }

    .near-mobile-close-button {
        height: 1.5rem;
        width: 1.5rem;
        padding: 0;
    }

    .near-mobile-logo {
        width: 8rem;
        height: 2rem;
    }

    .near-mobile-logo-section {
        display: flex;
        width: 100%;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        padding-bottom: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }

    .near-mobile-layout {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 1.25rem;
        padding: 0 2rem 2rem;
    }

    .near-mobile-card {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        position: absolute;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        height: 100%;
        width: 100%;
        background: linear-gradient(90deg, #5f8afa 0%, #6b6ef9 100%);
        font-size: 1rem;
        line-height: 1.6;
        transition: visibility linear, opacity 0.25s;
    }

    .near-mobile-qr-section {
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 1.75rem;
    }

    .near-mobile-qr-wrap {
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(8px);
        border-radius: 0.5rem;
    }

    .near-mobile-qr {
        padding: 2.3125rem;
    }

    .near-mobile-footer {
        width: 100%;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        display: flex;
        gap: 1.75rem;
    }

    .near-mobile-links {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        width: 100%;
    }

    .near-mobile-links a {
        width: 100%;
        max-height: 3rem;
        background: #000;
        border-radius: 9999px;
        border: 2px solid rgba(38, 38, 38, 0.08);
        cursor: pointer;
    }

    .near-mobile-footer p {
        text-align: center;
    }

    .near-mobile-close-button {
        font-family: Manrope;
        font-style: normal;
        font-weight: bolder;
        font-size: 1rem;
        border: none;
        margin: 0;
        outline: none;
        cursor: pointer;
        height: 2rem;
        background-color: transparent;
        justify-content: center;
        align-items: center;
    }

    .near-mobile-button {
        border: none;
        outline: 0;
        padding: 0;
        margin: 0;
        cursor: pointer;
        font-size: 1em;
        font-weight: bolder;
        flex-shrink: 0;
        width: 100%;
        height: 3rem;
        max-width: 336px;
        border-radius: 999px;
        transition: 0.1s opacity;
        background: #fff;
        text-decoration: none;
        color: #000 !important;
        align-items: center;
        justify-content: center;
    }

    .near-mobile-link {
        display: flex;
        flex: 1;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: #fff;
        font-weight: 600;
        padding: 0.75rem 1.125rem;
        transition: opacity 0.1s ease-in-out;
    }

    .near-mobile-link img {
        color: #fff;
    }

    .near-mobile-link:hover,
    .near-mobile-redirect:hover {
        opacity: 0.7;
    }

    .near-mobile-redirect.disabled {
        cursor: default;
        opacity: 0.7;
    }

    .near-mobile-subtitle {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.6);
    }

    .near-mobile-subtitle a {
        font-size: 0.875rem;
        font-weight: bold;
        color: #3f4246;
    }

    .near-mobile-icon {
        width: 1.5rem;
        height: 1.5rem;
        color: white;
        opacity: 0.4;
    }

    .near-mobile-responsive-layout {
        width: 100%;
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
    }
</style>
`;
