// src/index.ts
import express from "express";

const app = express();
const port = 3000;

app.get("/hello", (_req, res) => {
  res.send("Hello Backend!");
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});