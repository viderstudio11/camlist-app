// Installing a Cam2List app on the phone's home screen. Android (Chrome) offers its own prompt, which is
// held until the user taps Install; iPhone has no prompt, so the two steps are shown instead. Opened inside
// WhatsApp / Instagram / Facebook, nothing can be installed — the user is told to open the link in the browser.
let deferred = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; dispatchEvent(new Event('camlist-installable')); });
addEventListener('appinstalled', () => { deferred = null; dispatchEvent(new Event('camlist-installable')); });

export const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ios = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const inApp = () => /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)/i.test(navigator.userAgent);

// shown whenever the app is not already running from the home screen
export const canInstall = () => !standalone();

const STEPS = {
  he: {
    title: 'התקנה במסך הבית',
    inapp: 'הקישור נפתח בתוך וואטסאפ / אינסטגרם, ושם אי אפשר להתקין. לחץ על ⋮ או על ⋯ ← "פתח בדפדפן" (כרום או ספארי), ושם לחץ שוב על "התקן".',
    ios: 'בספארי: לחץ על כפתור השיתוף (ריבוע עם חץ למעלה) ← גלול ← "הוסף למסך הבית" ← "הוסף".',
    android: 'בכרום: לחץ על ⋮ (למעלה) ← "הוסף למסך הבית" או "התקן אפליקציה".',
  },
  en: {
    title: 'Install on the home screen',
    inapp: 'The link opened inside WhatsApp / Instagram, where nothing can be installed. Tap ⋮ or ⋯ → "Open in browser" (Chrome or Safari), then tap Install again.',
    ios: 'In Safari: tap Share (the square with the arrow up) → scroll → "Add to Home Screen" → "Add".',
    android: 'In Chrome: tap ⋮ (top) → "Add to Home screen" or "Install app".',
  },
};

// Install: the system prompt when the browser has one; otherwise the steps for this phone.
export async function install(lang, showSteps) {
  if (deferred && !inApp()) {
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* dismissed */ }
    deferred = null;
    return;
  }
  const s = STEPS[lang] || STEPS.en;
  showSteps(s.title, inApp() ? s.inapp : ios() ? s.ios : s.android);
}
