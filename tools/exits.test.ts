import { expect, test } from "bun:test";
import { loadExits } from "./cluster.ts";
import { relayArguments } from "./exits.ts";

test("the USA serves the Google services and Japan the crawlers, each with its relay city", () => {
  const byPurpose = Object.fromEntries(loadExits().map((exit) => [exit.purpose, relayArguments(exit)]));
  expect(byPurpose.google).toEqual(["relay", "set", "location", "us", "qas"]);
  expect(byPurpose.crawl).toEqual(["relay", "set", "location", "jp", "tyo"]);
});
