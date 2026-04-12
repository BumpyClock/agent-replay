import { writeFileSync } from "node:fs";
import { buildReplay } from "../../../src/build-replay.js";
import { serveReplay, watchAndWrite } from "../../../src/serve-replay.js";
import { createBuildOptions } from "../build-options.js";
import { DEFAULT_SERVE_PORT } from "../constants.js";
import type { CliContext } from "../context.js";
import { resolveInputFiles } from "../session-inputs.js";
import { exitWithError, openInBrowser } from "../utils.js";

export function handleBuildCommand({ positionals, values }: CliContext): void {
  const inputFiles = resolveInputFiles(positionals);
  const buildOptions = createBuildOptions(values, inputFiles);

  if (values.serve) {
    serveReplay(inputFiles, buildOptions, {
      port: values.port ? Number.parseInt(values.port, 10) : DEFAULT_SERVE_PORT,
      watch: values.watch,
      open: values.open,
    });
    return;
  }

  if (values.watch) {
    if (!values.output) {
      exitWithError("Error: --watch without --serve requires -o/--output");
    }
    watchAndWrite(inputFiles, buildOptions, { outputFile: values.output });
    return;
  }

  const { html, turnCount } = buildReplay(inputFiles, buildOptions);
  if (values.output) {
    writeFileSync(values.output, html);
    console.error(`Wrote ${values.output} (${turnCount} turns)`);
    if (values.open) {
      openInBrowser(values.output);
    }
    return;
  }

  if (values.open) {
    console.error(
      "Warning: --open requires -o/--output (cannot open stdout output)",
    );
  }
  process.stdout.write(html);
}
