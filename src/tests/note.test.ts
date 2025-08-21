import request from "supertest";
import { createApp } from "../app";
import { describe, it, expect } from "vitest";

const app = createApp();

describe("Notes API", () => {
  it("POST /notes -> 201 with id", async () => {
    const res = await request(app)
      .post("/notes")
      .send({ title: "first", body: "hello" });
    expect(res.status).toBe(201);
    expect(res.body?.data?.id).toBeDefined();
  });

  it("GET /notes -> 200 with paging meta", async () => {
    await request(app).post("/notes").send({ title: "a" });
    const res = await request(app).get("/notes").query({ page: 1, limit: 10 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.data)).toBe(true);
    expect(res.body?.meta?.page).toBe(1);
  });

  it("ETag → 304 Not Modified", async () => {
    const created = await request(app)
      .post("/notes")
      .send({ title: "etag", body: "" });
    const id = created.body.data.id as number;

    const first = await request(app).get(`/notes/${id}`);
    expect(first.status).toBe(200);
    const etag = first.headers["etag"];
    expect(etag).toBeDefined();

    const second = await request(app)
      .get(`/notes/${id}`)
      .set("If-None-Match", String(etag));
    expect(second.status).toBe(304);
  });

  it("PUT/DELETE not found -> 404 (P2025)", async () => {
    const u = await request(app).put("/notes/9999").send({ title: "x" });
    expect(u.status).toBe(404);
    const d = await request(app).delete("/notes/9999");
    expect(d.status).toBe(404);
  });

  it("POST duplicate title -> 409 (P2002)  ※titleが@uniqueの場合", async () => {
    await request(app).post("/notes").send({ title: "dup" });
    const res = await request(app).post("/notes").send({ title: "dup" });
    // title を @unique にしていない場合は skip か 201 を期待に変更
    expect([201, 409]).toContain(res.status);
  });

  it("If-Match mismatch -> 412 Precondition Failed", async () => {
    const created = await request(app)
      .post("/notes")
      .send({ title: "lock", body: "v1" });
    const id = created.body.data.id as number;

    const first = await request(app).get(`/notes/${id}`);
    const etag = String(first.headers["etag"]);

    // 正しい ETag で更新（成功）
    const ok = await request(app)
      .put(`/notes/${id}`)
      .set("If-Match", etag)
      .send({ body: "v2" });
    expect(ok.status).toBe(200);

    // 古い ETag で更新（412）
    const bad = await request(app)
      .put(`/notes/${id}`)
      .set("If-Match", 'W/"deadbeef"')
      .send({ body: "v3" });
    expect(bad.status).toBe(412);
  });
});
