export const NODE_TS_ARGS = ["--import", "tsx"] as const;

export function withTsx(args: string[]): string[] {
  return [...NODE_TS_ARGS, ...args];
}
