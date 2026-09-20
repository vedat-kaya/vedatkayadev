import { handleApi } from "./api.js";

export function fortressApiPlugin() {
  const middleware = (req, res, next) => {
    handleApi(req, res)
      .then((hit) => {
        if (!hit) next();
      })
      .catch(() => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ ok: false, error: "unavailable" }));
        }
      });
  };

  return {
    name: "fortress-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
