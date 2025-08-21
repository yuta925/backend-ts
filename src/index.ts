// src/index.ts
import { createApp } from "./app";

const app = createApp();
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`🚀 http://localhost:${port}`);
});
