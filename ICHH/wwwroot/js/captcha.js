window._recaptchaWidgetId = null;

window.renderRecaptcha = (elementId, siteKey) => {
    return new Promise((resolve) => {
        const tryRender = () => {
            const el = document.getElementById(elementId);
            if (!el) {
                setTimeout(tryRender, 300);
                return;
            }
            if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.render === 'function') {
                if (el.childElementCount > 0) {
                    resolve(true);
                    return;
                }
                try {
                    window._recaptchaWidgetId = grecaptcha.render(el, { sitekey: siteKey });
                    resolve(true);
                } catch (e) {
                    console.error('[reCAPTCHA] Render failed:', e.message);
                    resolve(false);
                }
            } else {
                setTimeout(tryRender, 300);
            }
        };
        tryRender();
    });
};

window.getCaptchaToken = () => {
    try {
        if (typeof grecaptcha !== 'undefined' && window._recaptchaWidgetId !== null) {
            return grecaptcha.getResponse(window._recaptchaWidgetId) || '';
        }
    } catch {
        // No widget rendered yet
    }
    return '';
};

window.resetCaptcha = () => {
    try {
        if (typeof grecaptcha !== 'undefined' && window._recaptchaWidgetId !== null) {
            grecaptcha.reset(window._recaptchaWidgetId);
        }
    } catch {
        // Widget may not exist
    }
};