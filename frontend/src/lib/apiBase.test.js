import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl, resolveBackendOrigin } from './apiBase.js';

test('resolveApiBaseUrl uses provided API URL when present', () => {
  assert.equal(resolveApiBaseUrl('https://api.example.com/api/v1'), 'https://api.example.com/api/v1');
});

test('resolveApiBaseUrl falls back to current origin when env is missing', () => {
  assert.equal(resolveApiBaseUrl('', 'https://app.example.com'), 'https://app.example.com/api/v1');
});

test('resolveBackendOrigin strips /api/v1 from the API base', () => {
  assert.equal(resolveBackendOrigin('https://api.example.com/api/v1'), 'https://api.example.com');
});
