import express from "express";
import router from "./routes";


const app = express();
const port = 3000;

app.use(express.json());              // JSON受け取り
app.use("/", router);                 // ルート集約

app.listen(port, () => {
  console.log(`🚀 http://localhost:${port}`);
});