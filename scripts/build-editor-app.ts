#!/usr/bin/env node

import { writeEditorAppBundle } from "../src/editor-assets.js";

const size = await writeEditorAppBundle();
console.log(`Built template/editor-app.js (${size} bytes)`);
