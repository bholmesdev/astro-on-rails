import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import glob from "fast-glob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  base: "/_astro",
  srcDir: "./app/views",
  integrations: [
    {
      name: "aor:views",
      hooks: {
        async "astro:server:setup"({ server }) {
          server.middlewares.use(async (req, res, next) => {
            console.log("middleware", req.url);
            next();
          });
        },
        async "astro:config:setup"() {
          const viewsDir = new URL("app/views/", import.meta.url);
          const pagesDir = new URL("pages/", viewsDir);
          const views = await glob(["**/*.astro", "!pages/**/*.astro"], {
            cwd: fileURLToPath(viewsDir),
            onlyFiles: true,
          });
          await mkdir(pagesDir, { recursive: true });
          for (const view of views) {
            const pageUrl = new URL(view, pagesDir);
            const viewRelativeToPage = path.relative(
              path.dirname(fileURLToPath(pageUrl)),
              fileURLToPath(new URL(view, viewsDir))
            );
            // TODO: map props and slots
            const pageContent = `---
import View from ${JSON.stringify(viewRelativeToPage)};
const { searchParams } = Astro.url;
const stringifiedProps = searchParams.get("props");
let props: any = {};
if (stringifiedProps) {
  props = JSON.parse(stringifiedProps);
}
---

<View {...props} />`;

            await mkdir(path.dirname(fileURLToPath(pageUrl)), {
              recursive: true,
            });
            await writeFile(pageUrl, pageContent);
          }
        },
      },
    },
  ],
});
