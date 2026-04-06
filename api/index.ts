import { handle } from "hono/vercel";
import app from "../packages/api/src/index.js";

export default handle(app);
