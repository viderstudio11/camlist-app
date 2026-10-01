// How the app feels in the hand: the buzz and (optional) click of camera hardware.
// A lens step is a short detent, like an aperture ring clicking into a stop; the end of the ring is a
// firmer double knock; adding gear is a light tap; exporting is the clap of a slate.
// Sound is off unless the user turns it on in settings; it is synthesised, so there are no files to load.

let sound = false;
let ac = null;

export const setSound = (on) => { sound = !!on; };

// Android: the Vibration API. Pulses under ~15 ms are below what many phone motors can be felt to do,
// so a detent is 18 ms. iPhone has no Vibration API; Safari (iOS 18+) does give the system haptic when a
// switch control is toggled during a tap, so a hidden one is toggled instead.
let iosSwitch = null;
function iosTap() {
  try {
    if (!iosSwitch) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox'; input.setAttribute('switch', ''); input.tabIndex = -1;
      label.setAttribute('aria-hidden', 'true');
      label.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
      label.appendChild(input); document.body.appendChild(label);
      iosSwitch = label;
    }
    iosSwitch.click();
  } catch { /* nothing to do */ }
}
const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
const buzz = (p) => {
  if (canVibrate) { try { navigator.vibrate(p); } catch { /* blocked */ } return; }
  iosTap();
  if (Array.isArray(p) && p.length > 2) setTimeout(iosTap, p[0] + p[1]);
};

// A short burst of filtered noise: dry and mechanical, closer to a detent than to a beep.
function click(gain = 0.25, ms = 14, freq = 2400) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const len = Math.round(ac.sampleRate * ms / 1000);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    const src = ac.createBufferSource(); src.buffer = buf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.2;
    const g = ac.createGain(); g.gain.value = gain;
    src.connect(bp).connect(g).connect(ac.destination);
    src.start();
  } catch { /* audio unavailable */ }
}

export const feel = {
  // one stop of a lens or aperture ring
  detent() { buzz(18); click(0.22, 12, 2600); },
  // the hard stop at either end of the ring
  end() { buzz([30, 70, 30]); click(0.32, 18, 900); setTimeout(() => click(0.32, 18, 900), 60); },
  // something went into the list
  add() { buzz(22); click(0.18, 10, 3200); },
  // a lens pinned for comparison
  pin() { buzz([25, 60, 25]); click(0.25, 14, 1800); },
  // the slate: a sharp clap when a document is exported
  clap() { buzz(40); click(0.6, 40, 1400); },
};
