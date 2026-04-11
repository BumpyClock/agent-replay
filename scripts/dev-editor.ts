#!/usr/bin/env node

import { startEditor } from "../src/editor-server.js";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7331;
const host = process.env.HOST || "127.0.0.1";

await startEditor(port, {
  host,
  open: false,
  devMode: true,
});
