import assert from 'node:assert/strict';
import { assessAdminClient, isWindowsChromeClient } from '../src/lib/adminRouteGuard';

const windowsChrome = isWindowsChromeClient({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
  platform: 'Windows',
});
const firefox = isWindowsChromeClient({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  platform: 'Windows',
});
const macChrome = isWindowsChromeClient({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
  platform: 'macOS',
});
const dellHint = assessAdminClient({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
  platform: 'Windows',
  model: 'Dell Inc.',
});

assert.equal(windowsChrome, true, 'Windows Chrome must reach the isolated admin route');
assert.equal(firefox, false, 'Firefox must receive the concealed route');
assert.equal(macChrome, false, 'Non-Windows Chrome must receive the concealed route');
assert.equal(dellHint.manufacturerHintPresent, true, 'A Dell Client Hint should be surfaced only as diagnostic context');
console.log('Admin route Windows Chrome eligibility checks passed.');
