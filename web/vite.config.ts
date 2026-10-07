import { defineConfig } from "vite";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
export default defineConfig({
  base: "./",
  build: { outDir: "../dist", emptyOutDir: true, sourcemap: false },
  plugins: [
    {
      name: "serve-verified-runtime-files",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const path = req.url?.split("?")[0];
          if (
            path &&
            /^\/(imd-deployment\.json|model\.md|abi\/[A-Za-z]+\.json)$/.test(
              path,
            )
          ) {
            try {
              res.setHeader(
                "Content-Type",
                path.endsWith(".json") ? "application/json" : "text/plain",
              );
              res.end(await readFile(resolve("../dist", path.slice(1))));
            } catch {
              next();
            }
          } else next();
        });
      },
    },
  ],
});
