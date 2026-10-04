/*
 * Firbot WhatsApp Onboarding — Meta Embedded Signup (frontend only).
 *
 * Only PUBLIC values belong here. Never put the App Secret, access tokens
 * or System User tokens in this file: everything here is visible to anyone.
 *
 * appId:      Meta App ID (App Dashboard > App settings > Basic).
 * configId:   Facebook Login for Business configuration ID for Embedded Signup.
 * sdkVersion: Graph API version passed to FB.init, e.g. the one shown in your
 *             App Dashboard. Left empty on purpose: copy it from Meta, don't guess.
 *
 * While any of these is empty the page will not attempt authentication.
 */
const META_CONFIG = {
    appId: '',
    configId: '',
    sdkVersion: ''
};

const SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';

const button = document.getElementById('connect-btn');
const statusEl = document.getElementById('status');

// Filled by handleEmbeddedSignupMessage when Meta reports the selected WABA.
let signupInfo = null;

function isMetaConfigured() {
    return Boolean(META_CONFIG.appId && META_CONFIG.configId && META_CONFIG.sdkVersion);
}

function showStatus(type, message) {
    // type: 'loading' | 'success' | 'error' | 'info'
    statusEl.className = 'status status--' + type;
    statusEl.textContent = message;
}

// Loads Meta's JS SDK only when the integration is configured.
function initializeMetaSDK() {
    return new Promise(function (resolve, reject) {
        if (window.FB) return resolve();

        window.fbAsyncInit = function () {
            FB.init({
                appId: META_CONFIG.appId,
                autoLogAppEvents: true,
                xfbml: false,
                version: META_CONFIG.sdkVersion
            });
            resolve();
        };

        const script = document.createElement('script');
        script.src = SDK_URL;
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.onerror = function () { reject(new Error('No se pudo cargar el SDK de Meta.')); };
        document.body.appendChild(script);
    });
}

function launchWhatsAppEmbeddedSignup() {
    if (!isMetaConfigured()) {
        showStatus('info', 'La integración con Meta se encuentra en proceso de configuración.');
        return;
    }

    button.disabled = true;
    showStatus('loading', 'Abriendo el proceso de Meta…');

    initializeMetaSDK()
        .then(function () {
            FB.login(function (response) {
                button.disabled = false;

                if (!response.authResponse || !response.authResponse.code) {
                    showStatus('error', 'La conexión no se completó. Podés intentarlo nuevamente.');
                    return;
                }

                // response.authResponse.code is a short-lived authorization code.
                // It must be sent to a secure backend (planned: a Make.com webhook)
                // that holds the App Secret and exchanges it for a token server-side.
                // NEVER exchange the code here: that would require the App Secret
                // in the browser. Along with the code, send signupInfo (waba_id,
                // phone_number_id) captured from the Embedded Signup message event.
                // TODO: POST { code, ...signupInfo } to the backend once it exists.
                showStatus('success', '¡Listo! Recibimos la autorización de Meta. El equipo de Firbot completará la conexión.');
            }, {
                config_id: META_CONFIG.configId,
                response_type: 'code',
                override_default_response_type: true,
                extras: { setup: {} }
            });
        })
        .catch(function (err) {
            button.disabled = false;
            showStatus('error', err.message);
        });
}

// Embedded Signup posts session info (WABA ID, phone number ID, or cancel/error)
// to this window via postMessage. Only trust messages from facebook.com.
function handleEmbeddedSignupMessage(event) {
    if (!isMetaConfigured()) return;

    let host;
    try { host = new URL(event.origin).hostname; } catch (e) { return; }
    if (host !== 'facebook.com' && !host.endsWith('.facebook.com')) return;

    let data;
    try { data = JSON.parse(event.data); } catch (e) { return; }
    if (!data || data.type !== 'WA_EMBEDDED_SIGNUP') return;

    if (data.event === 'CANCEL') {
        button.disabled = false;
        showStatus('error', 'Cancelaste el proceso. Podés intentarlo nuevamente cuando quieras.');
    } else if (data.event === 'ERROR') {
        button.disabled = false;
        showStatus('error', 'Meta informó un error durante la conexión. Intentalo nuevamente.');
    } else if (data.event && data.event.indexOf('FINISH') === 0) {
        // FINISH* events carry data.data.waba_id / phone_number_id. Public IDs, not secrets.
        signupInfo = data.data || null;
    }
}

button.addEventListener('click', launchWhatsAppEmbeddedSignup);
window.addEventListener('message', handleEmbeddedSignupMessage);
