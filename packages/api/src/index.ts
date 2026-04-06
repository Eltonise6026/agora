import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth.js";

const app = new Hono();

app.use("*", cors());
app.use("/v1/*", authMiddleware);

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
