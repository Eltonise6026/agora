import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { authMiddleware } from "./middleware/auth.js";
import { productsRouter } from "./routes/products.js";
import { categoriesRouter } from "./routes/categories.js";
import { storesRouter } from "./routes/stores.js";
import { registryRouter } from "./routes/registry.js";
import { adapterRouter } from "./routes/adapter.js";
import { commerceRouter } from "./routes/commerce.js";

const app = new Hono();

app.use("*", cors());
app.use("*", bodyLimit({ maxSize: 100 * 1024 })); // 100KB

// Public registry routes — mounted BEFORE auth middleware
app.route("/v1/registry", registryRouter);

// Public adapter routes — mounted BEFORE auth middleware
app.route("/v1/adapter", adapterRouter);

app.use("/v1/*", authMiddleware);

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/v1/products", productsRouter);
app.route("/v1/categories", categoriesRouter);
app.route("/v1/stores", storesRouter);
app.route("/v1", commerceRouter);

export default app;
