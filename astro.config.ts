import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import glob from "fast-glob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  srcDir: "generated",
  integrations: [
    {
      name: "aor:views",
      hooks: {
        async "astro:config:setup"() {
          const referenceDir = new URL("app/views/", import.meta.url);
          const generatedDir = new URL("generated/", import.meta.url);
          const pagesDir = new URL("pages/", generatedDir);
          const viewsDir = new URL("views/", pagesDir);
          const views = await glob(["**/*.astro", "!pages/**/*.astro"], {
            cwd: fileURLToPath(referenceDir),
            onlyFiles: true,
          });
          await mkdir(viewsDir, { recursive: true });
          for (const view of views) {
            const viewUrl = new URL(view, viewsDir);
            const viewRelativeToPage = path.relative(
              path.dirname(fileURLToPath(viewUrl)),
              fileURLToPath(new URL(view, referenceDir))
            );
            // TODO: map props and slots
            const pageContent = `---
import View from ${JSON.stringify(viewRelativeToPage)};
const props = Astro.locals.rubyProps ?? {};
---

<View {...props} />`;

            await mkdir(path.dirname(fileURLToPath(viewUrl)), {
              recursive: true,
            });
            await writeFile(viewUrl, pageContent);
          }
          const envdtsUrl = new URL("env.d.ts", referenceDir);

          if (!existsSync(envdtsUrl)) {
            const generatedEnvdtsUrl = new URL("env.d.ts", generatedDir);
            const relativePath = path.relative(
              path.dirname(fileURLToPath(envdtsUrl)),
              fileURLToPath(generatedEnvdtsUrl)
            );
            await writeFile(
              envdtsUrl,
              `/// <reference path=${JSON.stringify(relativePath)} />`
            );
          }

          // TODO: injectRoute()
          await writeFile(
            new URL("[...app].ts", pagesDir),
            await readFile(new URL("[...app].ts", import.meta.url), "utf-8")
          );
        },
      },
    },
  ],
});
