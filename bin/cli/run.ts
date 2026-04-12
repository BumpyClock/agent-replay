import { handleBuildCommand } from "./commands/build.js";
import { handleEditorCommand } from "./commands/editor.js";
import { handleExtractCommand } from "./commands/extract.js";
import { handleHelpCommand, handleMetaCommand } from "./commands/meta.js";
import { createCliContext } from "./context.js";

export async function runCli(): Promise<void> {
  const context = createCliContext();

  if (handleMetaCommand(context)) {
    return;
  }

  if (handleHelpCommand(context)) {
    return;
  }

  if (handleExtractCommand(context)) {
    return;
  }

  if (await handleEditorCommand(context)) {
    return;
  }

  handleBuildCommand(context);
}
