import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../dist/", import.meta.url));
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".md": "text/plain",
  ".svg": "image/svg+xml",
};
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  );
  if (!pathname.startsWith("/preview/")) {
    res.writeHead(404);
    res.end();
    return;
  }
  let relative = pathname.slice("/preview/".length) || "index.html";
  const path = resolve(root, relative);
  if (!path.startsWith(root) || relative.includes("..")) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    await stat(path);
    res.writeHead(200, {
      "Content-Type": mime[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(4173, "0.0.0.0", () =>
  console.log("Preview http://127.0.0.1:4173/preview/"),
);
setTimeout(() => server.close(), 30 * 60 * 1000).unref();
