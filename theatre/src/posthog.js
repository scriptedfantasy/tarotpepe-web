// posthog — how many people come in, and how far into the evening they get.
//
// COOKIELESS: nothing is stored in the visitor's browser (no cookie, no localStorage), so the room
// needs no consent banner. PostHog counts unique visitors with a daily server-side hash instead;
// that has to be switched on once in the PostHog project (Settings → Web analytics → cookieless
// server hash mode), or every event is dropped.
//
// ONLY A REAL VISITOR IS COUNTED: the production build, and never a browser driven by the tools
// (every proof and contact sheet in tools/ runs Playwright against this page, and would otherwise
// be most of the traffic). `?ph=1` counts a dev page on purpose.
//
// THE LIVE SITE SENDS THROUGH ITS OWN SERVER (server.mjs, /rel/): tracker blockers refuse
// posthog.com outright, and a visitor with one would not be counted at all. A dev page (?ph=1)
// talks to PostHog directly, as Vite has no relay.
//
// The project key and host are public by design (they ship in every page), so the build falls back
// to them when the VITE_ variables are not set — the Railway build does not need them.
import posthogClient from 'posthog-js';
import { phoneMode } from './core/phone.js';

const key = import.meta.env.VITE_POSTHOG_KEY || 'phc_yrxpbUBHKitNA3YUPezsHHEkudJexPRzDhR2XVy7utbz';
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

const forced = (() => {
  try {
    return new URLSearchParams(location.search).get('ph') === '1';
  } catch {
    return false;
  }
})();
const automated = typeof navigator !== 'undefined' && navigator.webdriver === true;
const live = (import.meta.env.PROD || forced) && !automated;

const posthog = live
  ? (posthogClient.init(key, {
    api_host: import.meta.env.PROD ? '/rel' : host,
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-05-30',
    cookieless_mode: 'always',
    logs: {
      serviceName: 'tarot-pepe-web',
      environment: import.meta.env.MODE,
    },
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  }), posthogClient)
  : null;

// every event says whether it came from the phone view
posthog?.register?.({ phone: phoneMode() });

export default posthog;
