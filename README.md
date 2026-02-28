# genimg

A small, typed CLI for generating images with OpenAI.

It reads `OPENAI_API_KEY` from a `.env` file in your current working directory, saves images to disk, and prints absolute file path(s) to stdout so it fits cleanly into shell scripts and pipes.

## Quick Start

Install dependencies:

```bash
yarn install
```

Create a `.env` in the directory where you plan to run the command:

```bash
OPENAI_API_KEY=your_api_key_here
```

Generate your first image:

```bash
yarn genimg "a red fox in snowfall"
```

Example output:

```bash
/absolute/path/to/a-red-fox-in-snowfall-1024x1024.png
```

## Global Command

If you want `genimg` available as a shell command everywhere, link it globally. No build step is required:

```bash
yarn link
```

Then:

```bash
genimg "a red fox in snowfall"
```

If `yarn link` complains about a missing global folder, set one:

```bash
mkdir -p ~/.yarn/bin
yarn config set prefix ~/.yarn
export PATH="$HOME/.yarn/bin:$PATH"
```

To remove the link later:

```bash
yarn unlink genimg
```

## What It Does

- If you do not pass `--out` or `--dir`, files are saved in the shell’s current working directory.
- If you do not pass `--name`, the file name is derived from the prompt and resolved image size.
- Output is always absolute path(s), one per line by default.
- The default model is `gpt-image-1.5`.
- The default size is `1024x1024`.
- The default format is `png`.
- The default quality is `auto`.
- When a requested size or quality is not supported by the selected model, `genimg` normalizes it to the closest supported request.

## Usage

```bash
genimg [prompt] [options]
```

You can provide the prompt in three ways:

1. As the first positional argument: `genimg "a red fox in snowfall"`
2. With `--prompt`: `genimg --prompt "a red fox in snowfall"`
3. Via stdin: `echo "a red fox in snowfall" | genimg`

## Common Patterns

Generate one image with defaults:

```bash
genimg "a watercolor owl reading by candlelight"
```

Use the explicit `--prompt` flag:

```bash
genimg --prompt "a watercolor owl reading by candlelight"
```

Read the prompt from stdin:

```bash
echo "a watercolor owl reading by candlelight" | genimg
```

Generate a landscape image with a preset:

```bash
genimg "retro robot portrait" --landscape
```

Generate a portrait image with a preset:

```bash
genimg "editorial fashion portrait" --portrait
```

Generate multiple images:

```bash
genimg "abstract poster design" --count 3
```

Write to a specific file:

```bash
genimg "mono line art bird" --out ./art/bird.png
```

Write to a specific directory:

```bash
genimg "mono line art bird" --dir ./art
```

Choose a file name:

```bash
genimg "mono line art bird" --dir ./art --name bird-line
```

Print structured output instead of plain paths:

```bash
genimg "mono line art bird" --json
```

Preview paths and request settings without calling OpenAI:

```bash
genimg "mono line art bird" --dry-run
```

Open the generated file after save on macOS:

```bash
genimg "mono line art bird" --open
```

## Sizing

There are three straightforward ways to control size:

1. Use a preset: `--square`, `--landscape`, or `--portrait`
2. Use an exact API size with `--size`
3. Use `--width` and `--height`, and let `genimg` normalize to a supported API size

### Presets

```bash
genimg "poster concept" --square
genimg "poster concept" --landscape
genimg "poster concept" --portrait
```

Preset sizes depend on the model:

- GPT image models: square `1024x1024`, landscape `1536x1024`, portrait `1024x1536`
- `dall-e-3`: square `1024x1024`, landscape `1792x1024`, portrait `1024x1792`
- `dall-e-2`: all presets resolve to `1024x1024`

### Exact API Sizes

Supported `--size` values:

- `auto`
- `256x256`
- `512x512`
- `1024x1024`
- `1536x1024`
- `1024x1536`
- `1792x1024`
- `1024x1792`

Example:

```bash
genimg "retro robot portrait" --size 1536x1024
```

If a valid API size is not supported by the selected model, `genimg` normalizes it before sending the request. Example: `--size 1792x1024` with `gpt-image-1.5` becomes `1536x1024`.

### Width and Height

Use `--width` and `--height` when you want to think in pixels and let the CLI map that to a supported API size:

```bash
genimg "retro robot portrait" --width 1600 --height 900
```

Normalization behavior:

- GPT image models: square => `1024x1024`, landscape => `1536x1024`, portrait => `1024x1536`
- `dall-e-3`: square => `1024x1024`, landscape => `1792x1024`, portrait => `1024x1792`
- `dall-e-2`: up to `256` => `256x256`, up to `512` => `512x512`, otherwise `1024x1024`

## File Naming

If you do not pass `--out`, the CLI generates a file name for you.

Default pattern:

```bash
{prompt-slug}-{size}.{format}
```

Examples:

- Prompt `a red fox in snowfall` at `1024x1024` becomes `a-red-fox-in-snowfall-1024x1024.png`
- Prompt `poster concept` with `--count 3` becomes:
  - `poster-concept-1024x1024-01.png`
  - `poster-concept-1024x1024-02.png`
  - `poster-concept-1024x1024-03.png`

If you pass `--name hero` with `--count 3`, files become:

- `hero-01.png`
- `hero-02.png`
- `hero-03.png`

If you pass `--out ./art/hero.png`, that exact file path is used, and `--count` must be `1`.

## Output Modes

By default, output is plain absolute paths:

```bash
genimg "forest shrine" --count 2
```

Example:

```bash
/abs/path/forest-shrine-1024x1024-01.png
/abs/path/forest-shrine-1024x1024-02.png
```

If you want structured output, `--json` includes metadata:

```bash
genimg "forest shrine" --json
```

Example:

```json
{
  "format": "png",
  "model": "gpt-image-1.5",
  "paths": [
    "/abs/path/forest-shrine-1024x1024.png"
  ],
  "prompt": "forest shrine",
  "size": "1024x1024"
}
```

## More Control

Choose a model:

```bash
genimg "ink sketch of a lighthouse" --model gpt-image-1
```

Choose output format:

```bash
genimg "minimal product photo of headphones" --format webp
```

Choose quality:

```bash
genimg "editorial fashion portrait" --quality high
```

Set transparency:

```bash
genimg "sticker icon of a happy avocado" --background transparent --format png
```

Set moderation:

```bash
genimg "storybook forest scene" --moderation low
```

Set compression for JPEG or WebP:

```bash
genimg "studio product shot" --format jpeg --compression 85
```

Pass an end-user id:

```bash
genimg "architectural concept render" --user demo-user-123
```

Run from the repo without using the yarn script:

```bash
node ./bin/genimg.js "surreal desert city at dusk"
```

## Options Reference

- `--prompt, -p <text>`: Prompt text. Optional if you use a positional prompt or stdin.
- `[prompt]`: Positional prompt argument.
- `--size, -s <size>`: Exact API size.
- `--width <px>`: Requested width, used with `--height`.
- `--height <px>`: Requested height, used with `--width`.
- `--square`: Square preset.
- `--landscape`: Landscape preset.
- `--portrait`: Portrait preset.
- `--model, -m <name>`: OpenAI image model. Default `gpt-image-1.5`.
- `--format, -f <png|jpeg|webp>`: Saved format. Default `png`.
- `--quality, -q <auto|low|medium|high|standard|hd>`: Quality. Default `auto`.
- `--background <auto|opaque|transparent>`: Background mode for GPT image models.
- `--moderation <auto|low>`: Moderation level for GPT image models.
- `--compression <0-100>`: Compression for JPEG/WebP. Default `100`.
- `--count, -n <1-10>`: Number of images. Default `1`.
- `--out, -o <file>`: Exact output file path. Only valid with `--count 1`.
- `--dir, -d <dir>`: Output directory when `--out` is not used. Default `.`.
- `--name <stem>`: File stem when `--out` is not used.
- `--user <id>`: Optional end-user identifier sent to OpenAI.
- `--dry-run`: Print resolved output without calling OpenAI.
- `--json`: Print structured JSON output.
- `--open`: Open generated file(s) after save on macOS.
- `--help`: Show help.

Format note:

- `jpeg` and `webp` are only supported for GPT image models.
- Non-GPT models are always saved as `png`.

Quality note:

- GPT image models receive `auto`, `low`, `medium`, or `high`.
- `dall-e-3` receives `standard` or `hd`.
- `dall-e-2` always receives `standard`.
- `genimg` normalizes the CLI quality flag to the correct API value for the selected model.

## Shell Usage

Because stdout is just path output by default, it works well in scripts:

```bash
img="$(genimg "mono line art bird")"
ls -l "$img"
```

With multiple images:

```bash
genimg "abstract poster design" --count 3 | while read -r img; do
  ls -l "$img"
done
```

With JSON output:

```bash
genimg "abstract poster design" --json
```

## Troubleshooting

`OPENAI_API_KEY is missing`

- Create a `.env` file in the directory where you run the command.
- Add `OPENAI_API_KEY=...`.

`--format other than png is only supported for GPT image models`

- Switch to a GPT image model such as `gpt-image-1.5`.
- Or use `--format png`.

`--open is only supported on macOS`

- Use `--open` only on macOS.
- On other systems, open the printed absolute path with your platform’s file opener.

`yarn link` cannot find a global folder

- Set a Yarn prefix:

```bash
mkdir -p ~/.yarn/bin
yarn config set prefix ~/.yarn
export PATH="$HOME/.yarn/bin:$PATH"
```

## Verify

Run the local checks:

```bash
yarn verify
```
