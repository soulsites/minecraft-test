/**
 * Build pipeline for the addon.
 *
 *   node tools/build.mjs             bundle scripts + copy packs into dist/
 *   node tools/build.mjs --watch     rebuild on every source change
 *   node tools/build.mjs --package   additionally write frost-addon.mcaddon
 *   node tools/build.mjs --deploy    additionally copy dist/ into the local
 *                                    com.mojang development pack folders
 */
import * as esbuild from "esbuild";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const ADDON_NAME = "frost-addon";

/** Modules the engine provides at runtime — never bundle them. */
const ENGINE_MODULES = [
  "@minecraft/server",
  "@minecraft/server-ui",
  "@minecraft/server-gametest",
  "@minecraft/server-net",
  "@minecraft/server-admin",
];

class Builder {
  constructor(options) {
    this.options = options;
  }

  get esbuildConfig() {
    return {
      entryPoints: [join(ROOT, "src/main.ts")],
      outfile: join(DIST, "behavior_pack/scripts/main.js"),
      bundle: true,
      format: "esm",
      target: "es2022",
      platform: "neutral",
      external: ENGINE_MODULES,
      minify: this.options.minify,
      sourcemap: this.options.minify ? false : "inline",
      legalComments: "none",
    };
  }

  copyPacks() {
    rmSync(DIST, { recursive: true, force: true });
    for (const pack of ["behavior_pack", "resource_pack"]) {
      cpSync(join(ROOT, "packs", pack), join(DIST, pack), { recursive: true });
    }
  }

  async buildOnce() {
    this.copyPacks();
    await esbuild.build(this.esbuildConfig);
    console.log("built dist/");
  }

  async watch() {
    this.copyPacks();
    const ctx = await esbuild.context(this.esbuildConfig);
    await ctx.watch();
    console.log("watching src/ — press Ctrl+C to stop");
  }

  /** Zips both packs into a single double-clickable .mcaddon file. */
  packageAddon() {
    const target = join(ROOT, `${ADDON_NAME}.mcaddon`);
    rmSync(target, { force: true });
    execFileSync("zip", ["-r", "-q", "-X", target, "behavior_pack", "resource_pack"], {
      cwd: DIST,
      stdio: "inherit",
    });
    console.log(`packaged ${ADDON_NAME}.mcaddon`);
  }

  /** Copies the packs into the local Minecraft development folders. */
  deploy() {
    const base = Builder.comMojangPath();
    if (!base) {
      console.warn("no com.mojang folder found — skipping deploy");
      return;
    }
    const targets = {
      behavior_pack: join(base, "development_behavior_packs", `${ADDON_NAME}_bp`),
      resource_pack: join(base, "development_resource_packs", `${ADDON_NAME}_rp`),
    };
    for (const [pack, target] of Object.entries(targets)) {
      rmSync(target, { recursive: true, force: true });
      mkdirSync(target, { recursive: true });
      cpSync(join(DIST, pack), target, { recursive: true });
      console.log(`deployed ${pack} -> ${target}`);
    }
  }

  static comMojangPath() {
    const candidates = [
      process.env.COM_MOJANG,
      join(
        homedir(),
        "AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang",
      ),
      join(
        homedir(),
        "Library/Application Support/mcpelauncher/games/com.mojang",
      ),
    ].filter(Boolean);
    return candidates.find((path) => existsSync(path));
  }
}

const argv = new Set(process.argv.slice(2));
const builder = new Builder({ minify: argv.has("--package") });

if (argv.has("--watch")) {
  await builder.watch();
} else {
  await builder.buildOnce();
  if (argv.has("--package")) builder.packageAddon();
  if (argv.has("--deploy")) builder.deploy();
}
