import path from 'node:path';

import type { ImageGenerateParamsNonStreaming, ImageModel } from 'openai/resources/images';

const CLEAN_RE = /[^a-z0-9]+/g;
const DASH_RE = /-+/g;
const MAX_SLUG = 60;

export type ApiSize = NonNullable<ImageGenerateParamsNonStreaming['size']>;
export type OutputFormat = NonNullable<ImageGenerateParamsNonStreaming['output_format']>;

const VALID_SIZES: ApiSize[] = [
  'auto',
  '256x256',
  '512x512',
  '1024x1024',
  '1536x1024',
  '1024x1536',
  '1792x1024',
  '1024x1792',
];
const VALID_SIZE_SET = new Set<ApiSize>(VALID_SIZES);

export const DEFAULT_MODEL: ImageModel = 'gpt-image-1.5';
export const DEFAULT_FORMAT: OutputFormat = 'png';
export const DEFAULT_QUALITY: NonNullable<ImageGenerateParamsNonStreaming['quality']> = 'auto';
export const DEFAULT_SIZE: ApiSize = '1024x1024';

type SizeArg = string | undefined;
type IntArg = number | undefined;

export function calcRequestSize(size: SizeArg, width: IntArg, height: IntArg, model: string): ApiSize {
  if (size) {
    return calcModelSize(size, model);
  }

  if (width !== undefined && height !== undefined) {
    return calcModelSize(`${width}x${height}`, model);
  }

  return DEFAULT_SIZE;
}

export function calcPresetSize(
  square: boolean,
  landscape: boolean,
  portrait: boolean,
  model: string,
): ApiSize | undefined {
  if (square) {
    return model === 'dall-e-2' ? '1024x1024' : '1024x1024';
  }

  if (landscape) {
    if (model === 'dall-e-2') {
      return '1024x1024';
    }

    if (model === 'dall-e-3') {
      return '1792x1024';
    }

    return '1536x1024';
  }

  if (portrait) {
    if (model === 'dall-e-2') {
      return '1024x1024';
    }

    if (model === 'dall-e-3') {
      return '1024x1792';
    }

    return '1024x1536';
  }

  return undefined;
}

export function calcModelSize(raw: string, model: string): ApiSize {
  const v = raw.trim().toLowerCase();

  if (calcValidForModel(v as ApiSize, model)) {
    return v as ApiSize;
  }

  const [w, h] = calcDims(v);

  if (model === 'dall-e-2') {
    if (Math.max(w, h) <= 256) {
      return '256x256';
    }

    if (Math.max(w, h) <= 512) {
      return '512x512';
    }

    return '1024x1024';
  }

  if (model === 'dall-e-3') {
    if (w === h) {
      return '1024x1024';
    }

    return w > h ? '1792x1024' : '1024x1792';
  }

  if (w === h) {
    return '1024x1024';
  }

  return w > h ? '1536x1024' : '1024x1536';
}

export function calcIsGptModel(model: string): boolean {
  return model.startsWith('gpt-image-');
}

export function calcBaseName(prompt: string, size: ApiSize, idx: number, count: number): string {
  const slug = calcSlug(prompt);
  const seq = count > 1 ? `-${String(idx + 1).padStart(2, '0')}` : '';
  return `${slug}-${size}${seq}`;
}

export function calcOutputPath(
  out: string | undefined,
  dir: string,
  name: string | undefined,
  prompt: string,
  size: ApiSize,
  format: string,
  idx: number,
  count: number,
): string {
  if (out) {
    return path.resolve(out);
  }

  const stem = name ? calcNamedStem(name, idx, count) : calcBaseName(prompt, size, idx, count);
  return path.resolve(dir, `${stem}.${format}`);
}

export function calcSavedFormat(model: string, format: OutputFormat, actual: string | undefined): string {
  if (actual) {
    return actual;
  }

  if (calcIsGptModel(model)) {
    return format;
  }

  return 'png';
}

export function calcSlug(prompt: string): string {
  const slug = prompt
    .trim()
    .toLowerCase()
    .replace(CLEAN_RE, '-')
    .replace(DASH_RE, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG);

  return slug || 'image';
}

export function calcValidSize(raw: string): boolean {
  return VALID_SIZE_SET.has(raw as ApiSize);
}

export function calcRequestQuality(
  raw: NonNullable<ImageGenerateParamsNonStreaming['quality']>,
  model: string,
): NonNullable<ImageGenerateParamsNonStreaming['quality']> {
  if (calcIsGptModel(model)) {
    return calcGptQuality(raw);
  }

  if (model === 'dall-e-3') {
    return raw === 'high' || raw === 'hd' ? 'hd' : 'standard';
  }

  return 'standard';
}

function calcNamedStem(name: string, idx: number, count: number): string {
  const stem = path.parse(name).name;

  if (count === 1) {
    return stem;
  }

  return `${stem}-${String(idx + 1).padStart(2, '0')}`;
}

function calcDims(raw: string): [number, number] {
  const [a = '', b = ''] = raw.split('x');
  return [Number(a), Number(b)];
}

function calcValidForModel(size: ApiSize, model: string): boolean {
  if (calcIsGptModel(model)) {
    return size === 'auto' || size === '1024x1024' || size === '1536x1024' || size === '1024x1536';
  }

  if (model === 'dall-e-3') {
    return size === '1024x1024' || size === '1792x1024' || size === '1024x1792';
  }

  return size === '256x256' || size === '512x512' || size === '1024x1024';
}

function calcGptQuality(
  raw: NonNullable<ImageGenerateParamsNonStreaming['quality']>,
): NonNullable<ImageGenerateParamsNonStreaming['quality']> {
  if (raw === 'hd' || raw === 'standard') {
    return 'auto';
  }

  return raw;
}
