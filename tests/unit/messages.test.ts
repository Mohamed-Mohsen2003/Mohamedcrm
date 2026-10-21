import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") acc[path] = value;
    else Object.assign(acc, flatten(value, path));
    return acc;
  }, {});
}

/** Top-level ICU argument names, e.g. {name} or {count, plural, …}. */
function args(message: string) {
  const names = new Set<string>();
  let depth = 0;
  for (let i = 0; i < message.length; i++) {
    const ch = message[i];
    if (ch === "{") {
      if (depth === 0) {
        const match = /^\{\s*([a-zA-Z_][\w]*)/.exec(message.slice(i));
        if (match?.[1]) names.add(match[1]);
      }
      depth++;
    } else if (ch === "}") depth--;
  }
  return [...names].sort();
}

const flatEn = flatten(en as Tree);
const flatAr = flatten(ar as Tree);

describe("translations", () => {
  it("Arabic covers every English key", () => {
    expect(Object.keys(flatAr).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it("uses the same placeholders in both languages", () => {
    for (const key of Object.keys(flatEn)) {
      expect({ key, args: args(flatAr[key] ?? "") }).toEqual({ key, args: args(flatEn[key]!) });
    }
  });

  it("has no dots in keys (next-intl uses them for nesting)", () => {
    for (const key of Object.keys(flatEn)) {
      expect(key.split(".").every((part) => part.length > 0)).toBe(true);
    }
  });
});
