/** Escape JSON payload before embedding inside `<script>` HTML. */
export function escapeJsonForScript(json: string): string {
  return json
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/<\//g, "<\\/")
    .replace(/<!--/g, "<\\!--");
}
