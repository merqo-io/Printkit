import { describe, expect, it } from "vitest";
import { labelBatchSchema } from "./label-batch";

describe("label batch boundary", () => {
  it.each(
    [
      [],
      Array.from({ length: 101 }, () => ({ item_name: "Kopi" })),
      [{ item_name: " " }],
      [{ item_name: 3 }],
      [{ item_name: "Kopi", item_options: "x".repeat(241) }],
    ].map((labels) => ({ labels })),
  )("rejects invalid batches", ({ labels }) => {
    expect(labelBatchSchema.safeParse(labels).success).toBe(false);
  });
  it("accepts 100 labels and trims item names", () => {
    const result = labelBatchSchema.parse(
      Array.from({ length: 100 }, () => ({ item_name: " Kopi " })),
    );
    expect(result).toHaveLength(100);
    expect(result[0].item_name).toBe("Kopi");
  });
});
