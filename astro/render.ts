import { experimental_AstroContainer } from "astro/container";
import { Page } from "./dist/server/all.mjs";

const container = await experimental_AstroContainer.create();

export function render() {
  return container.renderToString(Page);
}

console.log(await render());
