import { describe, expect, it, vi } from "vitest";
import {
  CleanupError,
  collectLogoPaths,
  listAllLogos,
  planCleanup,
  removeInBatches,
  type LogoStorage,
} from "./sticker-logo-cleanup";

const now = new Date("2026-11-01T12:00:00Z");
const day = 24 * 60 * 60 * 1000;
const old = "2026-10-01T00:00:00Z";
const fresh = "2026-11-01T06:00:00Z";

describe("collectLogoPaths", () => {
  it("returns logo paths and ignores other elements", () => {
    const design = {
      elements: [
        { kind: "text", text: "x" },
        { kind: "logo", path: "v/b/a.png" },
      ],
    };
    expect(collectLogoPaths(design, "t")).toEqual(["v/b/a.png"]);
  });

  it.each([
    null,
    "str",
    {},
    { elements: "no" },
    { elements: [null] },
    { elements: [{ kind: "logo" }] },
    { elements: [{ kind: "logo", path: "" }] },
  ])("throws on malformed design %j", (design) => {
    expect(() => collectLogoPaths(design, "t")).toThrow(CleanupError);
  });
});

describe("planCleanup", () => {
  const plan = (
    objects: { path: string; createdAt: string | null }[],
    refs: string[],
  ) => planCleanup({ objects, referenced: new Set(refs), now, graceMs: day });

  it("keeps a fresh unsaved upload", () => {
    const result = plan([{ path: "a", createdAt: fresh }], []);
    expect(result.keptByGrace).toEqual(["a"]);
    expect(result.orphans).toEqual([]);
  });

  it("deletes an old unsaved upload", () => {
    expect(plan([{ path: "a", createdAt: old }], []).orphans).toEqual(["a"]);
  });

  it("keeps an old path referenced by any template version or job snapshot", () => {
    const result = plan([{ path: "a", createdAt: old }], ["a"]);
    expect(result.keptReferenced).toEqual(["a"]);
    expect(result.orphans).toEqual([]);
  });

  it("keeps objects with a missing or invalid age", () => {
    const result = plan(
      [
        { path: "a", createdAt: null },
        { path: "b", createdAt: "garbage" },
      ],
      [],
    );
    expect(result.keptByGrace).toEqual(["a", "b"]);
  });

  it("reports counts", () => {
    const result = plan([{ path: "a", createdAt: old }], ["a", "gone"]);
    expect(result.listed).toBe(1);
    expect(result.referenced).toBe(2);
  });
});

type Tree = Record<
  string,
  { name: string; id: string | null; created_at?: string }[]
>;

function fakeStorage(tree: Tree) {
  const list = vi.fn(
    async (prefix: string, o: { limit: number; offset: number }) => ({
      data: (tree[prefix] ?? []).slice(o.offset, o.offset + o.limit),
      error: null,
    }),
  );
  const remove = vi.fn<LogoStorage["remove"]>(async () => ({ error: null }));
  return { list, remove } satisfies LogoStorage;
}

describe("listAllLogos", () => {
  it("recurses folders and paginates", async () => {
    const files = Array.from({ length: 150 }, (_, i) => ({
      name: `f${i}.png`,
      id: `id${i}`,
      created_at: old,
    }));
    const storage = fakeStorage({
      "": [{ name: "v1", id: null }],
      v1: [{ name: "b1", id: null }],
      "v1/b1": files,
    });
    const found = await listAllLogos(storage);
    expect(found).toHaveLength(150);
    expect(found[0]).toEqual({ path: "v1/b1/f0.png", createdAt: old });
  });

  it("throws on a listing error", async () => {
    const storage: LogoStorage = {
      list: async () => ({ data: null, error: { message: "x" } }),
      remove: async () => ({ error: null }),
    };
    await expect(listAllLogos(storage)).rejects.toThrow(CleanupError);
  });
});

describe("removeInBatches", () => {
  it("deletes in batches", async () => {
    const storage = fakeStorage({});
    const paths = Array.from({ length: 5 }, (_, i) => `p${i}`);
    expect(await removeInBatches(storage, paths, 2)).toBe(5);
    expect(storage.remove).toHaveBeenCalledTimes(3);
  });

  it("stops on error", async () => {
    const storage: LogoStorage = {
      list: async () => ({ data: [], error: null }),
      remove: async () => ({ error: { message: "x" } }),
    };
    await expect(removeInBatches(storage, ["a"])).rejects.toThrow(CleanupError);
  });
});
