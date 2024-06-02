import { experimental_AstroContainer } from "astro/container";
// @ts-expect-error May not be built
import * as pages from "./dist/server/all.mjs";

const container = await experimental_AstroContainer.create();

const server = Bun.serve({
  port: 3001,
  fetch(request) {
    const { searchParams } = new URL(request.url);
    const stringifiedProps = searchParams.get("props");
    let props = {};
    if (stringifiedProps) {
      props = JSON.parse(stringifiedProps);
    }
    console.log(props);
    return container.renderToResponse(pages.Page, {
      request,
      props,
    });
  },
});

console.log(server.port);
