import { Hono } from "hono";
import { caricatureApp } from "@/caricatures.route";
import { pollApp } from "@/poll.route";
import { assetsApp } from "@/assets.route";

export { CaricatureWorkflow } from "./lib/workflows/caricature";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.route("/assets", assetsApp);
app.route("/api/caricatures", caricatureApp);
app.route("/api/status", pollApp);

export default app;
