#!/usr/bin/env node

import { tsImport } from 'tsx/esm/api';

await tsImport('../src/genimg.ts', import.meta.url);
