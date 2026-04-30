import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

test("Vercel serves extension assets with Owlbear CORS headers", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  const wildcardHeaders = config.headers?.find((entry) => entry.source === "/(.*)")?.headers ?? [];

  assert.deepEqual(
    wildcardHeaders.find((header) => header.key === "Access-Control-Allow-Origin"),
    {
      key: "Access-Control-Allow-Origin",
      value: "https://www.owlbear.rodeo",
    }
  );
  assert.deepEqual(
    wildcardHeaders.find((header) => header.key === "Access-Control-Allow-Methods"),
    {
      key: "Access-Control-Allow-Methods",
      value: "GET, OPTIONS",
    }
  );
  assert.deepEqual(
    wildcardHeaders.find((header) => header.key === "Access-Control-Allow-Headers"),
    {
      key: "Access-Control-Allow-Headers",
      value: "Content-Type",
    }
  );
});
