import { describe, expect, it } from "vitest";
import { parentOf, SETTINGS_HUB, tabOf } from "@/lib/sections";

describe("sections", () => {
  it("keeps the parent tab selected on the screens reached through it", () => {
    expect(tabOf("/")).toBe("home");
    expect(tabOf("/search")).toBe("search");
    expect(tabOf("/collections/branding")).toBe("collections");
    expect(tabOf("/saved")).toBe("collections");
    expect(tabOf("/inbox")).toBe("settings");
    expect(tabOf("/moodboards/abc")).toBe("settings");
    expect(tabOf("/r/abc")).toBeNull();
  });

  it("sends each hub screen back to its tab, and leaves screens with their own back link alone", () => {
    for (const h of SETTINGS_HUB) expect(parentOf(h.href)).toBe("/settings");
    expect(parentOf("/saved")).toBe("/collections");
    expect(parentOf("/collections/branding")).toBe("/collections");
    expect(parentOf("/collections")).toBeNull();
    expect(parentOf("/moodboards/abc")).toBeNull();
    expect(parentOf("/settings")).toBeNull();
  });

  it("does not match a sibling route that only shares a prefix", () => {
    expect(tabOf("/inboxes")).toBeNull();
  });
});
