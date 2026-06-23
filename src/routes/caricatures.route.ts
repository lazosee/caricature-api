import { Hono } from "hono/tiny";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.post("/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("image") as File;
    if (!file)
      return c.json(
        {
          message: "Missing image payload",
        },
        400,
      );

    const imageKey = `${crypto.randomUUID()}.jpg`;

    // Immediately park the file inside the bucket
    await c.env.R2.put(imageKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    // Trigger the workflow out of band
    const instance = await c.env.CARICATURE_WORKFLOW.create({
      params: { imageKey },
    });

    return c.json(
      {
        success: true,
        workflowInstanceId: instance.id,
        pollingUrl: `/api/status?id=${instance.id}&key=${imageKey}`,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err: any) {
    return c.json(
      {
        message: err.message,
      },
      500,
    );
  }
});

export { app as caricatureApp };
