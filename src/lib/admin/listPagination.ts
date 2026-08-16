/**
 * Parse and clamp admin list pagination query params.
 */
export function parseListPagination(
  searchParams: URLSearchParams,
  defaults: { pageSize?: number; maxPageSize?: number } = {},
): { page: number; pageSize: number; q: string } {
  const defaultSize = defaults.pageSize ?? 10;
  const maxSize = defaults.maxPageSize ?? 50;
  const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const rawSize = Number.parseInt(
    searchParams.get("pageSize") ?? String(defaultSize),
    10,
  );
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = Math.min(
    maxSize,
    Math.max(5, Number.isFinite(rawSize) && rawSize > 0 ? rawSize : defaultSize),
  );
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  return { page, pageSize, q };
}

export function paginateSlice<T>(
  items: T[],
  page: number,
  pageSize: number,
): {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
} {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}
