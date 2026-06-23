import { Hono } from "hono/tiny";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", async (c) => {
  const id = c.req.query("id");
  const key = c.req.query("key");

  if (!id || !key)
    return c.json(
      {
        message: "Missing constraints",
      },
      400,
    );

  const instance = await c.env.CARICATURE_WORKFLOW.get(id);
  const status = await instance.status();

  if (status.status === "complete") {
    return c.json({
      status: "complete",
      imageUrl: `/assets/caricatures/${key}`,
    });
  }

  return c.json({
    status: status.status,
  });
});

export { app as pollApp };
