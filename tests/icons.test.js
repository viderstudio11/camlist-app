import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEPT_ICON, TOOL_ICON, deptIcon, toolIcon } from '../js/ui/icons.js';

const DEPTS = ['cameras', 'lenses', 'video', 'media', 'tripods', 'grip', 'power', 'accessories', 'expendables', 'other'];
const TOOLS = ['media', 'fov', 'shutter', 'kelvin', 'hours', 'offload', 'sun', 'luts', 'units', 'pickup', 'viewfinder'];

test('every department and tool has a solid, self-contained icon', () => {
  for (const [set, keys] of [[DEPT_ICON, DEPTS], [TOOL_ICON, TOOLS]]) {
    for (const k of keys) {
      const svg = set[k];
      assert.ok(svg, `missing icon ${k}`);
      assert.match(svg, /^<svg [^>]*fill="currentColor"/, `${k} is not a solid svg`);
      assert.doesNotMatch(svg, /stroke=/, `${k} still has an outline stroke`);
      assert.doesNotMatch(svg, /http/, `${k} points outside the app`);
    }
  }
});

test('unknown keys fall back instead of breaking a screen', () => {
  assert.equal(deptIcon('nope'), DEPT_ICON.other);
  assert.equal(toolIcon('nope'), TOOL_ICON.units);
});
