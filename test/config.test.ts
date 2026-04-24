import { describe, it, expect } from "vitest";
import { stripJsonc, parseJsonc } from "../src/config.js";

describe("stripJsonc", () => {
  it("removes single-line comments", () => {
    const input = '{ "key": "value" // comment\n}';
    const result = stripJsonc(input);
    expect(JSON.parse(result)).toEqual({ key: "value" });
  });

  it("removes multi-line comments", () => {
    const input = '{ /* comment */ "key": "value" }';
    const result = stripJsonc(input);
    expect(JSON.parse(result)).toEqual({ key: "value" });
  });

  it("preserves comments inside strings", () => {
    const input = '{ "key": "value // not a comment" }';
    const result = stripJsonc(input);
    expect(JSON.parse(result)).toEqual({ key: "value // not a comment" });
  });

  it("handles trailing commas are not valid JSON but comments are stripped", () => {
    const input = '{ "key": "value" }';
    const result = stripJsonc(input);
    expect(JSON.parse(result)).toEqual({ key: "value" });
  });
});

describe("parseJsonc", () => {
  it("parses standard JSON", () => {
    expect(parseJsonc('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSONC with comments", () => {
    const input = `{
      // this is a comment
      "profiles": {
        /* another comment */
        "dev": { "model": "test" }
      }
    }`;
    expect(parseJsonc(input)).toEqual({
      profiles: { dev: { model: "test" } },
    });
  });
});
