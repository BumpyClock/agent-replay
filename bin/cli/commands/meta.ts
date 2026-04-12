import { listThemes } from "../../../src/themes.js";
import type { CliContext } from "../context.js";
import { printHelp } from "../help.js";
import { readPackageVersion } from "../utils.js";

export function handleMetaCommand({ values }: CliContext): boolean {
  if (values.version) {
    console.log(readPackageVersion());
    return true;
  }

  if (values["list-themes"]) {
    for (const name of listThemes()) {
      console.log(name);
    }
    return true;
  }

  return false;
}

export function handleHelpCommand({ values }: CliContext): boolean {
  if (!values.help) {
    return false;
  }
  printHelp();
  return true;
}
