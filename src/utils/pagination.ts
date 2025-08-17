export type PageParams = { page: number; limit: number };
export function parsePage(q: any, defaults: PageParams = { page: 1, limit: 10 }): PageParams {
  const page = Math.max(1, Number(q.page ?? defaults.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit ?? defaults.limit) || 10));
  return { page, limit };
}
export function sliceByPage<T>(arr: T[], { page, limit }: PageParams) {
  const start = (page - 1) * limit;
  return arr.slice(start, start + limit);
}