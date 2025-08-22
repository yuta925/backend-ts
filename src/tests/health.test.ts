import request from "supertest";
import { createApp } from "../app";
import { describe, it, expect } from "vitest";

const app = createApp();

describe("Health endpoints", () => {
  it("GET /healthz -> 200", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body?.status).toBe("ok");
  });

  it("GET /readyz -> 200 or 503 depending on DB", async () => {
    const res = await request(app).get("/readyz");
    expect([200, 503]).toContain(res.status);
  });
});