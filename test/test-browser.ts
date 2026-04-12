import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderFromTemplate } from "../src/browser.js";

const TEMPLATE = `<!DOCTYPE html>
<html>
  <head>
    <title>/*PAGE_TITLE*/</title>
    <meta name="description" content="/*PAGE_DESCRIPTION*/">
    <meta property="og:image" content="/*OG_IMAGE*/">
    <style>/*THEME_CSS*/ body { background: /*THEME_BG*/; font-size: /*FONT_SIZE*/; }</style>
  </head>
  <body data-speed="/*INITIAL_SPEED*/" data-font="/*FONT_SIZE_NAME*/">
    <label>/*USER_LABEL*/</label>
    <label>/*ASSISTANT_LABEL*/</label>
    <input id="thinking" /*CHECKED_THINKING*/>
    <input id="tools" /*CHECKED_TOOLS*/>
    <div data-real="/*HAS_REAL_TIMESTAMPS*/false"></div>
    <script>
      const bookmarks = "/*BOOKMARKS_DATA*/";
      const files = "/*FILES_DATA*/";
      const turns = "/*TURNS_DATA*/";
    </script>
  </body>
</html>`;

describe("browser renderer", () => {
  it("embeds escaped turn and file payloads into template output", () => {
    const html = renderFromTemplate(
      TEMPLATE,
      [
        {
          index: 1,
          user_text: 'Hello </script>\n"quote"',
          blocks: [
            {
              kind: "tool_use",
              text: "",
              tool_call: {
                name: "Read",
                input: { file_path: "/repo/src/app.ts" },
                result: 'result </script>\n"quote"',
              },
              timestamp: null,
            },
          ],
          timestamp: "2026-04-11T00:00:00Z",
          system_events: ['opened </script>\n"quote"'],
        },
      ],
      {
        bookmarks: [{ turn: 1, label: "Start" }],
        redactSecrets: false,
      },
    );

    assert.match(html, /const bookmarks = ".*Start.*";/s);
    assert.match(html, /const files = ".*\/repo\/src\/app\.ts.*app\.ts.*";/s);
    assert.match(
      html,
      /const turns = ".*<\\\/script>.*\\\\n.*\\\\\\"quote\\\\\\".*";/s,
    );
    assert.match(html, /const turns = ".*opened <\\\/script>.*";/s);
  });
});
