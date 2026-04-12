import { DEFAULT_EDITOR_PORT } from "../constants.js";
import type { CliContext } from "../context.js";
import { resolveEditorInitialFile } from "../session-inputs.js";

export async function handleEditorCommand({
  positionals,
  values,
}: CliContext): Promise<boolean> {
  if (positionals.length !== 0 && positionals[0] !== "editor") {
    return false;
  }

  if (positionals[0] !== "editor" && values.help) {
    return false;
  }

  const { startEditor } = await import("../../../src/editor-server.js");
  const initialFile =
    positionals[0] === "editor"
      ? resolveEditorInitialFile(positionals[1])
      : undefined;

  await startEditor(
    values.port ? Number.parseInt(values.port, 10) : DEFAULT_EDITOR_PORT,
    {
      host: values.host || "127.0.0.1",
      initialFile,
      noOriginCheck: values["no-origin-check"],
    },
  );

  return true;
}
