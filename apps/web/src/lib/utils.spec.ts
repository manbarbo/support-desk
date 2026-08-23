import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("should join multiple classes with spaces", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("should filter out undefined", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
  });

  it("should filter out null", () => {
    expect(cn("foo", null, "bar")).toBe("foo bar");
  });

  it("should filter out false", () => {
    expect(cn("foo", false, "bar")).toBe("foo bar");
  });

  it("should filter out empty strings", () => {
    expect(cn("foo", "", "bar")).toBe("foo bar");
  });

  it("should handle no arguments", () => {
    expect(cn()).toBe("");
  });

  it("should handle a single class", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe(
      "base active",
    );
  });

  it("should handle mixed types", () => {
    expect(cn("foo", null, undefined, false, "", "bar")).toBe("foo bar");
  });
});
