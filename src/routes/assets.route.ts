import { Hono } from "hono/tiny";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/caricatures/:key", async (c) => {
  const key = c.req.param("key");
  const obj = await c.env.R2.get(`caricatures/${key}`);
  if (!obj) return c.notFound();

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Access-Control-Allow-Origin", "*");

  return c.newResponse(obj.body, {
    headers,
  });
});

export { app as assetsApp };
