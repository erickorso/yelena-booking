import { describe, expect, it } from "vitest";
import {
  paginateSlice,
  parseListPagination,
} from "@/lib/admin/listPagination";

describe("listPagination", () => {
  it("parses and clamps page/pageSize/q", () => {
    const params = new URLSearchParams({
      page: "2",
      pageSize: "100",
      q: "  Ana  ",
    });
    expect(parseListPagination(params)).toEqual({
      page: 2,
      pageSize: 50,
      q: "ana",
    });
  });

  it("slices pages and clamps overflow page", () => {
    const rows = [1, 2, 3, 4, 5];
    const page1 = paginateSlice(rows, 1, 2);
    expect(page1).toMatchObject({
      items: [1, 2],
      page: 1,
      total: 5,
      totalPages: 3,
    });
    const overflow = paginateSlice(rows, 99, 2);
    expect(overflow.page).toBe(3);
    expect(overflow.items).toEqual([5]);
  });
});
