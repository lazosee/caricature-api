import { Hono } from "hono";
import { CaricatureWorkflow } from "$/workflows/caricature";
import { caricatureApp } from "@/caricatures.route";
import { pollApp } from "@/poll.route";
import { assetsApp } from "@/assets.route";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.route("/assets", assetsApp);
app.route("/api/caricatures", caricatureApp);
app.route("/api/status", pollApp);

export { CaricatureWorkflow };
export default app;
