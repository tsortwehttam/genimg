# Instructions

See @README.md

## General

- Write simple, minimal, modular code that is strongly typed and:
  - DRY: If you repeat code in multiple places, extract it into a reusable function.
  - YAGNI: But make abstractions only when you actually need it in more than one place.
- Use short variable names in clean, tight, well-organized stanzas
- Don't add comments unless critical; code should be self-descriptive
  - If you add a comment, it should explain _why_ the code is needed, not what it does
- Prefer pure functions with explicit inputs and outputs
- Prefer early return over conditional
- Array properties should default to empty arrays, not `null`
- Prefer libraries' own types over writing your own
- Don't create classes (unless instructed)
- Don't add console.logs - unless temporarily for debugging
  - But leave existing console.logs/info untouched
- Never include backward compat code (unless instructed)
- When researching APIs and docs, use latest content (it is 2026)
- If you're unsure about something, ask!
- Make shared constants `UPPER_CASE`
- For functions, prefer camel case verbs (`calcTimeAt(x)`, not `timeAt(x)`)
- For variables and object properties, prefer concise single words (`elapsed`, not `elapsedTime`)
- Fix problems the _right_ way (robust), not hacky
- For functional units that don't require I/O or significant setup/teardown, add unit tests

## JavaScript & TypeScript

- Avoid mjs whenever possible
- Use yarn (not npm)
- After logical changes, package upgrades, or refactors, run `yarn verify` for typecheck and unit tests
- Never use the `any` type
- For command line tools and arg parsing, always use yargs
- Prefer function declaration style (`function getFoo() {...}`)
- Don't add try/catch blocks
- Rely on strong typing rather than throwing
  - Be liberal in what we accept
- Don't use `optional?:` types function arguments or object properties
- Don't use default exports (unless necessary)
- Make Zod schemas PascalCase, like `FooSchema`
- See `lib/*` for pre-existing utility/helpers files
- When naming files with shared code, use `FooUtils.ts` for i/o stuff, `BarHelpers.ts`
  - e.g. `MathHelpers.ts`, `WebsocketUtils.ts`, etc.
