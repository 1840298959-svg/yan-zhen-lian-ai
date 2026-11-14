/* eslint-disable @typescript-eslint/no-require-imports -- Bundled desktop entry point. */
const { createServer } = require("node:http");
const { timingSafeEqual } = require("node:crypto");
const path = require("node:path");

async function main() {
  const appDir = __dirname;
  const token = process.env.YZL_DESKTOP_SESSION ?? "";
  if (!/^[\da-f]{64}$/.test(token) || !process.env.YZL_DATA_DIR || !process.env.DATABASE_URL) {
    throw new Error("Desktop session configuration is incomplete.");
  }
  const tokenBytes = Buffer.from(token, "ascii");
  delete process.env.YZL_DESKTOP_SESSION;

  process.chdir(appDir);
  process.env.NODE_ENV = "production";
  process.env.NEXT_TELEMETRY_DISABLED = "1";
  const { config } = require(path.join(appDir, ".next-desktop", "required-server-files.json"));
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  const next = require("next");

  let handler;
  let originHost;
  const server = createServer((request, response) => {
    const cookie = request.headers.cookie?.match(/(?:^|;\s*)yzl_session=([\da-f]{64})(?:;|$)/)?.[1];
    const origin = request.headers.origin;
    const sameOrigin = !origin || origin === `http://${originHost}`;
    if (request.headers.host !== originHost || !sameOrigin || !cookie ||
        !timingSafeEqual(Buffer.from(cookie, "ascii"), tokenBytes)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" }).end("Desktop session required");
      return;
    }
    if (!handler) {
      response.writeHead(503).end();
      return;
    }
    Promise.resolve(handler(request, response)).catch(() => {
      if (!response.headersSent) response.writeHead(500);
      response.end();
    });
  });

  // The parent keeps stdin open. Closing the desktop window also releases the listener.
  process.stdin.on("end", () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
  process.stdin.resume();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  originHost = `127.0.0.1:${port}`;
  const app = next({ dev: false, dir: appDir, hostname: "127.0.0.1", port, conf: config });
  await app.prepare();
  handler = app.getRequestHandler();
  process.stdout.write(`YZL_READY ${port}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Desktop server failed");
  process.exit(1);
});
