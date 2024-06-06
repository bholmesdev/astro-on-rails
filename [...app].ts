import type { APIRoute } from "astro";

export const ALL: APIRoute = async (ctx) => {
  const rubyResponse = await fetch(
    new URL(ctx.url.pathname, "http://localhost:3000"),
    { headers: ctx.request.headers }
  );
  const view = rubyResponse.headers.get("X-Astro-View");
  if (!view) {
    return rubyResponse;
  }
  let props = {};
  const contentType = rubyResponse.headers.get("Content-Type");
  const baseType = contentType?.split(";")?.[0]?.toLowerCase();
  if (baseType === "application/json") {
    props = await rubyResponse.json();
  }

  const rewriteUrl = new URL(
    "/views/" + view.replace("index", ""),
    ctx.url.origin
  );
  (ctx.locals as any).rubyProps = props;
  return ctx.rewrite(rewriteUrl);
};
