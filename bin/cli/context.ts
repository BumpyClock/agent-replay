import { parseCliArgs } from "../../src/cli-args.js";

export type CliParseResult = ReturnType<typeof parseCliArgs>;
export type CliValues = CliParseResult["values"];

export interface CliContext {
  values: CliValues;
  positionals: string[];
}

export function createCliContext(): CliContext {
  const parsed = parseCliArgs();
  return {
    values: parsed.values,
    positionals: parsed.positionals,
  };
}
