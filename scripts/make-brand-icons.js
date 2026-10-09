// node scripts/make-brand-icons.js — writes the app icon (VTL, design V2 in js/ui/brand.js) as
// icons/icon.svg and the PNG sizes the manifest and iPhone ask for. Needs @resvg/resvg-js (dev).
import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { iconSVG } from '../js/ui/brand.js';

writeFileSync('icons/icon.svg', iconSVG({ size: 512 }));
for (const s of [180, 192, 512]) writeFileSync(`icons/icon-${s}.png`, new Resvg(iconSVG({ size: s })).render().asPng());
console.log('icons/ written');
