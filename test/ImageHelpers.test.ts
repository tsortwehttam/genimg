import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calcBaseName,
  calcModelSize,
  calcOutputPath,
  calcPresetSize,
  calcRequestQuality,
  calcRequestSize,
  calcSavedFormat,
  calcSlug,
  calcValidSize,
} from '../src/ImageHelpers.js';

test('calcModelSize maps gpt widths to supported landscape size', () => {
  assert.equal(calcModelSize('1600x900', 'gpt-image-1.5'), '1536x1024');
});

test('calcModelSize preserves exact sizes for non-gpt models', () => {
  assert.equal(calcModelSize('1024x1792', 'dall-e-3'), '1024x1792');
});

test('calcRequestSize prefers explicit size', () => {
  assert.equal(calcRequestSize('512x512', 800, 600, 'dall-e-2'), '512x512');
});

test('calcSlug derives a safe file stem', () => {
  assert.equal(calcSlug('  Neon cat / city skyline!!!  '), 'neon-cat-city-skyline');
});

test('calcBaseName includes size and sequence', () => {
  assert.equal(calcBaseName('Neon cat', '1024x1024', 1, 3), 'neon-cat-1024x1024-02');
});

test('calcOutputPath resolves generated names', () => {
  const file = calcOutputPath(undefined, 'out', undefined, 'Neon cat', '1024x1024', 'png', 0, 1);
  assert.match(file, /\/out\/neon-cat-1024x1024\.png$/);
});

test('calcOutputPath adds sequence for named multi-image output', () => {
  const file = calcOutputPath(undefined, 'out', 'hero', 'Neon cat', '1024x1024', 'png', 1, 3);
  assert.match(file, /\/out\/hero-02\.png$/);
});

test('calcValidSize accepts supported API sizes', () => {
  assert.equal(calcValidSize('auto'), true);
  assert.equal(calcValidSize('1536x1024'), true);
  assert.equal(calcValidSize('wide'), false);
});

test('calcPresetSize maps landscape per model', () => {
  assert.equal(calcPresetSize(false, true, false, 'gpt-image-1.5'), '1536x1024');
  assert.equal(calcPresetSize(false, true, false, 'dall-e-3'), '1792x1024');
  assert.equal(calcPresetSize(false, true, false, 'dall-e-2'), '1024x1024');
});

test('calcModelSize normalizes unsupported explicit sizes for the selected model', () => {
  assert.equal(calcModelSize('256x256', 'gpt-image-1.5'), '1024x1024');
  assert.equal(calcModelSize('1792x1024', 'gpt-image-1.5'), '1536x1024');
  assert.equal(calcModelSize('1536x1024', 'dall-e-3'), '1792x1024');
});

test('calcRequestQuality normalizes quality for each model family', () => {
  assert.equal(calcRequestQuality('hd', 'gpt-image-1.5'), 'auto');
  assert.equal(calcRequestQuality('high', 'dall-e-3'), 'hd');
  assert.equal(calcRequestQuality('low', 'dall-e-3'), 'standard');
  assert.equal(calcRequestQuality('high', 'dall-e-2'), 'standard');
});

test('calcSavedFormat falls back to png for non-gpt models', () => {
  assert.equal(calcSavedFormat('dall-e-3', 'png', 'png'), 'png');
  assert.equal(calcSavedFormat('dall-e-2', 'webp', undefined), 'png');
  assert.equal(calcSavedFormat('gpt-image-1.5', 'webp', undefined), 'webp');
});
