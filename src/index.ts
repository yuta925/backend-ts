import "express-async-errors"
import express from "express";
import router from "./routes";
import { errorHandler, notFound } from "./middleware/error";

const app = express();
const port = 3000;

app.use(express.json());              // JSON受け取り
app.use("/", router);                 // ルート集約

app.use(notFound);
app.use(errorHandler)

app.listen(port, () => {
  console.log(`🚀 http://localhost:${port}`);
});