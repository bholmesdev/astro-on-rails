import { defineConfig } from "astro/config";
import adapter from "./adapter/index.mjs";
import type {
  IncomingMessage,
  OutgoingHttpHeaders,
  ServerResponse,
} from "node:http";
import { experimental_AstroContainer } from "astro/container";

export default defineConfig({
  output: "server",
  adapter: adapter(),
  srcDir: "./app/views",
  integrations: [
    {
      name: "aor:dev",
      hooks: {
        async "astro:server:setup"({ server }) {
          const container = await experimental_AstroContainer.create();

          server.middlewares.use(async function middleware(
            incomingMessage,
            res,
            next
          ) {
            const request = toRequest(incomingMessage);
            if (!request.url) return next();

            const { searchParams } = new URL(request.url);
            const stringifiedProps = searchParams.get("props");
            const view = searchParams.get("view");
            if (!view) {
              return writeResponse(new Response(null, { status: 400 }), res);
            }
            let props = { message: "Placeholder" };
            if (stringifiedProps) {
              props = JSON.parse(stringifiedProps);
            }
            try {
              const page = await server.ssrLoadModule(
                `./app/views/${view}.astro`
              );
              const response = await container.renderToResponse(page.default, {
                request,
                props,
              });
              writeResponse(response, res);
            } catch (e) {
              const message = e instanceof Error ? e.message : `${e}`;
              writeResponse(new Response(message, { status: 400 }), res);
            }
          });
        },
      },
    },
  ],
});

/**
 * Allow the request body to be explicitly overridden. For example, this
 * is used by the Express JSON middleware.
 */
interface NodeRequest extends IncomingMessage {
  body?: unknown;
}

const clientAddressSymbol = Symbol.for("astro.clientAddress");

function toRequest(req: NodeRequest) {
  const protocol =
    req.headers["x-forwarded-proto"] ??
    ("encrypted" in req.socket && req.socket.encrypted ? "https" : "http");
  const hostname =
    req.headers["x-forwarded-host"] ??
    req.headers.host ??
    req.headers[":authority"];
  const port = req.headers["x-forwarded-port"];

  const portInHostname =
    typeof hostname === "string" &&
    typeof port === "string" &&
    hostname.endsWith(port);
  const hostnamePort = portInHostname
    ? hostname
    : hostname + (port ? `:${port}` : "");

  const url = `${protocol}://${hostnamePort}${req.url}`;
  const options: RequestInit = {
    method: req.method || "GET",
    headers: makeRequestHeaders(req),
  };
  const bodyAllowed = options.method !== "HEAD" && options.method !== "GET";
  if (bodyAllowed) {
    Object.assign(options, makeRequestBody(req));
  }
  const request = new Request(url, options);

  const clientIp = req.headers["x-forwarded-for"];
  if (clientIp) {
    Reflect.set(request, clientAddressSymbol, clientIp);
  } else if (req.socket?.remoteAddress) {
    Reflect.set(request, clientAddressSymbol, req.socket.remoteAddress);
  }
  return request;
}

function makeRequestHeaders(req: NodeRequest): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else {
      headers.append(name, value);
    }
  }
  return headers;
}

function makeRequestBody(req: NodeRequest): RequestInit {
  if (req.body !== undefined) {
    if (typeof req.body === "string" && req.body.length > 0) {
      return { body: Buffer.from(req.body) };
    }

    if (
      typeof req.body === "object" &&
      req.body !== null &&
      Object.keys(req.body).length > 0
    ) {
      return { body: Buffer.from(JSON.stringify(req.body)) };
    }

    // This covers all async iterables including Readable and ReadableStream.
    if (
      typeof req.body === "object" &&
      req.body !== null &&
      typeof (req.body as any)[Symbol.asyncIterator] !== "undefined"
    ) {
      return asyncIterableToBodyProps(req.body as AsyncIterable<any>);
    }
  }

  // Return default body.
  return asyncIterableToBodyProps(req);
}

function asyncIterableToBodyProps(iterable: AsyncIterable<any>): RequestInit {
  return {
    // Node uses undici for the Request implementation. Undici accepts
    // a non-standard async iterable for the body.
    // @ts-expect-error
    body: iterable,
    // The duplex property is required when using a ReadableStream or async
    // iterable for the body. The type definitions do not include the duplex
    // property because they are not up-to-date.
    duplex: "half",
  };
}

async function writeResponse(source: Response, destination: ServerResponse) {
  const { status, headers, body } = source;
  destination.writeHead(status, createOutgoingHttpHeaders(headers));
  if (!body) return destination.end();
  try {
    const reader = body.getReader();
    destination.on("close", () => {
      // Cancelling the reader may reject not just because of
      // an error in the ReadableStream's cancel callback, but
      // also because of an error anywhere in the stream.
      reader.cancel().catch((err) => {
        // eslint-disable-next-line no-console
        console.error(
          `There was an uncaught error in the middle of the stream while rendering ${destination.req.url}.`,
          err
        );
      });
    });
    let result = await reader.read();
    while (!result.done) {
      destination.write(result.value);
      result = await reader.read();
    }
    destination.end();
    // the error will be logged by the "on end" callback above
  } catch {
    destination.end("Internal server error");
  }
}

export const createOutgoingHttpHeaders = (
  headers: Headers | undefined | null
): OutgoingHttpHeaders | undefined => {
  if (!headers) {
    return undefined;
  }

  // at this point, a multi-value'd set-cookie header is invalid (it was concatenated as a single CSV, which is not valid for set-cookie)
  const nodeHeaders: OutgoingHttpHeaders = Object.fromEntries(
    headers.entries()
  );

  if (Object.keys(nodeHeaders).length === 0) {
    return undefined;
  }

  // if there is > 1 set-cookie header, we have to fix it to be an array of values
  if (headers.has("set-cookie")) {
    const cookieHeaders = headers.getSetCookie();
    if (cookieHeaders.length > 1) {
      // the Headers.entries() API already normalized all header names to lower case so we can safely index this as 'set-cookie'
      nodeHeaders["set-cookie"] = cookieHeaders;
    }
  }

  return nodeHeaders;
};
