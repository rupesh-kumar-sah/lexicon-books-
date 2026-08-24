import assert from 'node:assert/strict';
import { isDellWindowsChromeClient } from '../src/lib/adminRouteGuard';

const dellChrome = isDellWindowsChromeClient({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36 Dell Laptop',
  platform: 'Windows',
  model: 'Dell Inc.',
});
const firefox = isDellWindowsChromeClient({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0 Dell Laptop',
  platform: 'Windows',
  model: 'Dell Inc.',
});
const nonDellChrome = isDellWindowsChromeClient({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
  platform: 'Windows',
  model: 'Lenovo',
});
const nonWindowsDell = isDellWindowsChromeClient({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36 Dell Laptop',
  platform: 'macOS',
  model: 'Dell',
});

assert.equal(dellChrome, true, 'Dell Windows Chrome must reach the admin route');
assert.equal(firefox, false, 'Firefox must receive the concealed route');
assert.equal(nonDellChrome, false, 'Non-Dell Chrome must receive the concealed route');
assert.equal(nonWindowsDell, false, 'Non-Windows Dell clients must receive the concealed route');
console.log('Admin route client eligibility checks passed.');
