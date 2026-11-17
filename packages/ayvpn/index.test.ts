import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { libraryName, open, State, VpnError } from "./index.ts";

test("library names follow the platform", () => {
  expect(libraryName("linux")).toBe("libayvpn_ffi.so");
  expect(libraryName("win32")).toBe("ayvpn_ffi.dll");
  expect(libraryName("darwin")).toBe("libayvpn_ffi.dylib");
});

// Runs where the built library is given ($AYVPN_LIB), with no daemon: the calls must fail cleanly.
describe.skipIf(!Bun.env.AYVPN_LIB || !existsSync(Bun.env.AYVPN_LIB))("the built library", () => {
  test("binds the ABI and reports a missing daemon as a typed error", () => {
    const vpn = open();
    try {
      expect(() => vpn.login("123")).toThrow(new VpnError(-2));
      let error: unknown;
      try {
        const state = vpn.state();
        expect(Object.values(State)).toContain(state);
      } catch (e) {
        error = e;
      }
      if (error) expect((error as VpnError).code).toBe(-1);
    } finally {
      vpn.close();
    }
  });
});
