# Firbot WhatsApp Onboarding

Public onboarding page that lets Firbot customers connect their existing WhatsApp Business account to Firbot through Meta's **WhatsApp Embedded Signup** (Facebook Login for Business).

Production URL: https://thebotspawner.github.io/firbot-whatsapp-onboarding/

> V1 is meant for Meta App Review. It will later become the real customer onboarding page.

## 1. Purpose

Customers open this page and click **Conectar con Meta**. Meta's own popup handles authentication and lets the customer choose the WhatsApp Business account to share with Firbot. They keep their number and can keep using the WhatsApp Business app on their phone.

## 2. Current architecture

A static site with no build step and no dependencies:

| File | Role |
|---|---|
| `index.html` | Onboarding page (Spanish) |
| `styles.css` | Styles |
| `script.js` | Meta config + Embedded Signup logic |
| `privacy.html`, `terms.html` | Placeholder legal pages |

Meta's JS SDK (`https://connect.facebook.net/en_US/sdk.js`) is loaded **only** after the CTA is clicked and **only** when the integration is configured. Until then, clicking the CTA shows *"La integración con Meta se encuentra en proceso de configuración."* No fake authentication, no fake success.

All asset paths are relative (`./styles.css`), so the site works under the `/firbot-whatsapp-onboarding/` subpath.

## 3. Run locally

Any static server works. From the repository root:

```bash
python -m http.server 8000
# open http://localhost:8000/
```

To test serving from a subdirectory (as on GitHub Pages), run the server from the parent folder and open `http://localhost:8000/firbot-whatsapp-onboarding/`.

Note: Meta's popup only works on domains registered in the Meta app (and over HTTPS), so the real signup flow must be tested on the deployed URL or a registered domain.

## 4. Deploy with GitHub Pages

1. Push to `main`.
2. Repository **Settings → Pages**.
3. **Source:** *Deploy from a branch*. **Branch:** `main`, folder `/ (root)`. Save.
4. Wait for the deployment and open https://thebotspawner.github.io/firbot-whatsapp-onboarding/.
5. Keep **Enforce HTTPS** enabled.

## 5. Where APP_ID and CONFIG_ID go

At the top of `script.js`:

```js
const META_CONFIG = {
    appId: '',      // Meta App ID (public)
    configId: '',   // Facebook Login for Business configuration ID (public)
    sdkVersion: ''  // Graph API version for FB.init, copied from the Meta App Dashboard
};
```

These are public identifiers and are safe in the frontend. If any of them is empty, the page will not attempt authentication.

In the Meta App Dashboard you'll also need to register `thebotspawner.github.io` as an allowed domain for Facebook Login for Business (allowed domains / JS SDK settings).

## 6. Never store secrets here

This repository and the site it serves are **public**. Anything committed here, or in `script.js`, can be read by anyone.

**Never** commit:

- the Meta **App Secret**
- user, page, or **System User access tokens**
- webhook verify tokens, Make.com API keys, or any other credential

The OAuth authorization code returned by Meta is useless without the App Secret. That's why the code exchange **must** happen on a backend that keeps the secret private. Doing it in the browser would expose the secret.

## 7. Planned architecture

```
Browser / GitHub Pages
    ↓
Meta Embedded Signup
    ↓
temporary authorization code + WABA information
    ↓
secure Make.com webhook/backend
    ↓
Meta Graph API
    ↓
WABA subscription + customer-specific webhook override
```

- The browser receives a short-lived `code` (from `FB.login`) and the `waba_id` / `phone_number_id` (from Embedded Signup `postMessage` events).
- The browser will POST those to a secure Make.com webhook (see the `TODO` in `script.js`).
- Make.com, holding the App Secret, exchanges the code for a token, subscribes the app to the customer's WABA, and configures the customer-specific webhook override.

## 8. Frontend only, on purpose

This repository is intentionally **frontend-only**. No backend, no server code, no secrets, no build. All privileged work belongs in the separate secure backend (Make.com at first).
