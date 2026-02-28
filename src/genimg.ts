#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import dotenv from 'dotenv';
import OpenAI from 'openai';
import type { ImageGenerateParamsNonStreaming, ImagesResponse } from 'openai/resources/images';
import yargs from 'yargs';
import type { ArgumentsCamelCase } from 'yargs';
import { hideBin } from 'yargs/helpers';

import {
  type ApiSize,
  type OutputFormat,
  DEFAULT_FORMAT,
  DEFAULT_MODEL,
  DEFAULT_QUALITY,
  calcIsGptModel,
  calcOutputPath,
  calcPresetSize,
  calcRequestQuality,
  calcRequestSize,
  calcSavedFormat,
  calcValidSize,
} from './ImageHelpers.js';

type Args = {
  background: NonNullable<ImageGenerateParamsNonStreaming['background']>;
  compression: number;
  count: number;
  dir: string;
  dryRun: boolean;
  format: OutputFormat;
  height: number | undefined;
  json: boolean;
  landscape: boolean;
  model: string;
  moderation: NonNullable<ImageGenerateParamsNonStreaming['moderation']>;
  name: string | undefined;
  open: boolean;
  out: string | undefined;
  prompt: string | undefined;
  portrait: boolean;
  quality: NonNullable<ImageGenerateParamsNonStreaming['quality']>;
  square: boolean;
  size: string | undefined;
  user: string | undefined;
  width: number | undefined;
};

type CheckArgs = {
  compression: number;
  count: number;
  format: Args['format'];
  height: number | undefined;
  landscape: boolean;
  model: string;
  open: boolean;
  out: string | undefined;
  portrait: boolean;
  size: string | undefined;
  square: boolean;
  width: number | undefined;
};

type ParsedArgs = ArgumentsCamelCase<Args>;
type RunInfo = {
  format: string;
  model: string;
  paths: string[];
  prompt: string;
  size: ApiSize;
};

await run();

async function run(): Promise<void> {
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

  const argv = await buildCli().parseAsync();
  const args = argv as ParsedArgs;
  const prompt = await calcPrompt(args);
  const size = calcSize(args);
  const planned = calcPlanned(args, prompt, size);

  if (args.dryRun) {
    printOutput(args.json, planned);
    return;
  }

  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    throw new Error('OPENAI_API_KEY is missing. Define it in the current directory .env file.');
  }

  const client = new OpenAI({ apiKey: key });
  const body = calcRequest(args, prompt, size);
  const res = await client.images.generate(body);
  const done = await saveImages(res, args, prompt, size);

  if (args.open) {
    await openFiles(done.paths);
  }

  printOutput(args.json, done);
}

function buildCli() {
  return yargs(hideBin(process.argv))
    .scriptName('genimg')
    .usage('Usage: $0 [prompt] [options]')
    .example('$0 "a red fox in snowfall"', 'Generate a default square image')
    .example('$0 "poster concept" --landscape', 'Generate a landscape image')
    .example('$0 "poster concept" --count 3', 'Generate three images')
    .option('prompt', {
      alias: 'p',
      type: 'string',
      description: 'Image prompt to send to OpenAI. If omitted, the first positional arg or stdin is used.',
    })
    .option('size', {
      alias: 's',
      type: 'string',
      description: 'Explicit API size like auto, 1024x1024, 1536x1024, or 1024x1536',
    })
    .option('width', {
      type: 'number',
      integer: true,
      description: 'Width in pixels. Use with --height. GPT image models normalize this to a supported size.',
    })
    .option('height', {
      type: 'number',
      integer: true,
      description: 'Height in pixels. Use with --width. GPT image models normalize this to a supported size.',
    })
    .option('square', {
      type: 'boolean',
      default: false,
      description: 'Use a square preset',
    })
    .option('landscape', {
      type: 'boolean',
      default: false,
      description: 'Use a landscape preset',
    })
    .option('portrait', {
      type: 'boolean',
      default: false,
      description: 'Use a portrait preset',
    })
    .option('model', {
      alias: 'm',
      type: 'string',
      default: DEFAULT_MODEL,
      description: 'OpenAI image model',
    })
    .option('format', {
      alias: 'f',
      choices: ['png', 'jpeg', 'webp'] as const,
      default: DEFAULT_FORMAT,
      description: 'Output file format',
    })
    .option('quality', {
      alias: 'q',
      choices: ['auto', 'low', 'medium', 'high', 'standard', 'hd'] as const,
      default: DEFAULT_QUALITY,
      description: 'Generation quality',
    })
    .option('background', {
      choices: ['auto', 'opaque', 'transparent'] as const,
      default: 'auto',
      description: 'Background mode for GPT image models',
    })
    .option('moderation', {
      choices: ['auto', 'low'] as const,
      default: 'auto',
      description: 'Moderation level for GPT image models',
    })
    .option('compression', {
      type: 'number',
      default: 100,
      description: 'Compression percent for jpeg/webp output',
    })
    .option('count', {
      alias: 'n',
      type: 'number',
      integer: true,
      default: 1,
      description: 'Number of images to generate',
    })
    .option('out', {
      alias: 'o',
      type: 'string',
      description: 'Exact output file path. Only valid when --count=1.',
    })
    .option('dir', {
      alias: 'd',
      type: 'string',
      default: '.',
      description: 'Output directory used when --out is not set',
    })
    .option('name', {
      type: 'string',
      description: 'Output file name without extension when --out is not set',
    })
    .option('user', {
      type: 'string',
      description: 'Optional end-user identifier sent to OpenAI',
    })
    .option('dry-run', {
      type: 'boolean',
      default: false,
      description: 'Resolve prompt, size, and output paths without calling OpenAI',
    })
    .option('json', {
      type: 'boolean',
      default: false,
      description: 'Print structured JSON output instead of plain paths',
    })
    .option('open', {
      type: 'boolean',
      default: false,
      description: 'Open generated file(s) after save on macOS',
    })
    .check((v: CheckArgs) => {
      const size = v.size;
      const width = v.width;
      const height = v.height;
      const count = v.count;
      const out = v.out;
      const compression = v.compression;
      const model = v.model;
      const format = v.format;
      const presetCount = Number(v.square) + Number(v.landscape) + Number(v.portrait);

      if (size && !calcValidSize(size)) {
        return 'Expected --size to be one of the supported API sizes. Use --width and --height for flexible dimensions.';
      }

      if ((width !== undefined && height === undefined) || (width === undefined && height !== undefined)) {
        return 'Use --width and --height together.';
      }

      if (width !== undefined && width <= 0) {
        return '--width must be greater than 0.';
      }

      if (height !== undefined && height <= 0) {
        return '--height must be greater than 0.';
      }

      if (size && (width !== undefined || height !== undefined)) {
        return 'Use either --size or --width/--height, not both.';
      }

      if (presetCount > 1) {
        return 'Use only one of --square, --landscape, or --portrait.';
      }

      if (presetCount > 0 && (size || width !== undefined || height !== undefined)) {
        return 'Use either a preset, --size, or --width/--height.';
      }

      if (!count || count < 1 || count > 10) {
        return '--count must be between 1 and 10.';
      }

      if (model === 'dall-e-3' && count > 1) {
        return '--count greater than 1 is not supported for dall-e-3.';
      }

      if (out && count > 1) {
        return '--out only supports a single generated image. Use --dir with --count instead.';
      }

      if (compression < 0 || compression > 100) {
        return '--compression must be between 0 and 100.';
      }

      if (!calcIsGptModel(model) && format !== 'png') {
        return '--format other than png is only supported for GPT image models.';
      }

      if (v.open && process.platform !== 'darwin') {
        return '--open is only supported on macOS.';
      }

      return true;
    })
    .strictOptions()
    .help();
}

function calcRequest(args: Args, prompt: string, size: ApiSize): ImageGenerateParamsNonStreaming {
  const body: ImageGenerateParamsNonStreaming = {
    prompt,
    model: args.model,
    n: args.count,
    quality: calcRequestQuality(args.quality, args.model),
    size,
  };

  if (args.user) {
    body.user = args.user;
  }

  if (calcIsGptModel(args.model)) {
    body.background = args.background;
    body.moderation = args.moderation;
    body.output_format = args.format;

    if (args.format !== 'png') {
      body.output_compression = args.compression;
    }
  } else {
    body.response_format = 'b64_json';
  }

  return body;
}

async function saveImages(res: ImagesResponse, args: Args, prompt: string, requestedSize: ApiSize): Promise<RunInfo> {
  const items = res.data ?? [];

  if (items.length === 0) {
    throw new Error('OpenAI did not return any images.');
  }

  const actualSize = res.size ?? requestedSize;
  const format = calcSavedFormat(args.model, args.format, res.output_format);
  const paths: string[] = [];

  for (const [idx, item] of items.entries()) {
    if (!item.b64_json) {
      throw new Error('OpenAI returned an image without base64 content.');
    }

    const file = calcOutputPath(
      args.out,
      args.dir,
      args.name,
      item.revised_prompt ?? prompt,
      actualSize,
      format,
      idx,
      items.length,
    );

    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, Buffer.from(item.b64_json, 'base64'));
    paths.push(file);
  }

  return {
    format,
    model: args.model,
    paths,
    prompt,
    size: actualSize,
  };
}

async function calcPrompt(args: ParsedArgs): Promise<string> {
  const prompt = args.prompt ?? calcPositionalPrompt(args);

  if (prompt) {
    return prompt;
  }

  if (process.stdin.isTTY) {
    throw new Error('Provide a prompt with --prompt, a positional argument, or stdin.');
  }

  const text = await readStdin();

  if (!text) {
    throw new Error('Stdin was empty. Provide a prompt with --prompt, a positional argument, or stdin.');
  }

  return text;
}

function calcPositionalPrompt(args: ParsedArgs): string | undefined {
  const words = args._.filter((v): v is string => typeof v === 'string');

  if (words.length === 0) {
    return undefined;
  }

  const prompt = words.join(' ').trim();

  return prompt || undefined;
}

function calcSize(args: ParsedArgs): ApiSize {
  const preset = calcPresetSize(args.square, args.landscape, args.portrait, args.model);

  if (preset) {
    return preset;
  }

  return calcRequestSize(args.size, args.width, args.height, args.model);
}

function calcPlanned(args: ParsedArgs, prompt: string, size: ApiSize): RunInfo {
  const format = calcSavedFormat(args.model, args.format, undefined);
  const paths = Array.from({ length: args.count }, (_, idx) =>
    calcOutputPath(args.out, args.dir, args.name, prompt, size, format, idx, args.count),
  );

  return {
    format,
    model: args.model,
    paths,
    prompt,
    size,
  };
}

function printOutput(json: boolean, info: RunInfo): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(info, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${info.paths.join('\n')}\n`);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString('utf8').trim();
}

async function openFiles(paths: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('open', paths, { stdio: 'ignore' });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`open exited with code ${String(code)}`));
    });
  });
}
