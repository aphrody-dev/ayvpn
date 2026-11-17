#!/usr/bin/env bun
// Switches the local Mullvad client between the exits of exits.toml: the USA for the Google services, Japan for the crawlers.
//   bun tools/exits.ts plan            the exits and the relay each one selects
//   bun tools/exits.ts use <purpose>   point the client's relay constraint at that exit (google | crawl); it does not connect
//   bun tools/exits.ts use <purpose> --connect   also connect, and print the visible location
// Connecting changes how this whole machine reaches the network (and any IP-restricted API); it is never done without --connect.
import { loadExits, type Exit } from "./cluster.ts";
import { mullvadBinary } from "./setup.ts";

/** The `mullvad` arguments that select an exit's relay. */
export const relayArguments = (exit: Exit): string[] => ["relay", "set", "location", exit.country, exit.city];

if (import.meta.main) {
  const [command = "plan", purpose, flag] = Bun.argv.slice(2);
  const exits = loadExits();
  const binary = mullvadBinary();
  const run = (args: string[]) => Bun.spawnSync([binary, ...args], { stdout: "pipe", stderr: "pipe" });
  if (command === "plan") {
    for (const exit of exits) console.log(`${exit.purpose.padEnd(7)} ${exit.country}/${exit.city}  mullvad ${relayArguments(exit).join(" ")}`);
  } else if (command === "use") {
    const exit = exits.find((entry) => entry.purpose === purpose);
    if (!exit) throw new Error(`unknown purpose ${purpose}; choose ${exits.map((entry) => entry.purpose).join(" or ")}`);
    const set = run(relayArguments(exit));
    if (set.exitCode !== 0) throw new Error(set.stderr.toString().trim());
    console.log(`relay: ${exit.country}/${exit.city} (${exit.purpose})`);
    if (flag === "--connect") {
      run(["connect", "--wait"]);
      console.log(run(["status"]).stdout.toString().trim());
    }
  } else {
    console.error("usage: exits.ts plan | use <google|crawl> [--connect]");
    process.exit(2);
  }
}
