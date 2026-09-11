/**
 * Build pipeline for the addon.
 *
 *   node tools/build.mjs             bundle scripts + copy packs into dist/
 *   node tools/build.mjs --watch     rebuild on every source change
 *   node tools/build.mjs --package   bump the patch version, stamp it into
 *                                    the manifests + pack names, and write
 *                                    frost-addon-x.y.z.mcaddon
 *   node tools/build.mjs --deploy    additionally copy dist/ into the local
 *                                    com.mojang development pack folders
 *
 * The version lives only in package.json (see tools/version.mjs). Every
 * --package run bumps the patch number and stamps it into both manifests'
 * version arrays and into "pack.name" in every texts/*.lang file, so each
 * exported .mcaddon carries a unique, human-visible version. Minecraft then
 * treats every import as an upgrade of the same pack (same UUID, higher
 * version) instead of a conflicting duplicate - no need to delete the old
 * pack first, and the version in the pack name tells you which one is active.
 */
import * as esbuild from "esbuild";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { AddonVersion } from "./version.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const ADDON_NAME = "frost-addon";
const version = new AddonVersion(join(ROOT, "package.json"));

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

  /**
   * Stamps `versionString` into both manifests' version arrays (own header,
   * every module, and the cross-pack dependency entry) and replaces the
   * {{VERSION}} placeholder in every copied .lang file's pack.name.
   */
  stampVersion(versionString) {
    const versionArray = AddonVersion.parse(versionString);

    for (const pack of ["behavior_pack", "resource_pack"]) {
      const manifestPath = join(DIST, pack, "manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

      manifest.header.version = versionArray;
      for (const module of manifest.modules) module.version = versionArray;
      for (const dependency of manifest.dependencies ?? []) {
        if (dependency.uuid) dependency.version = versionArray;
      }

      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }

    for (const langFile of Builder.findLangFiles(DIST)) {
      const stamped = readFileSync(langFile, "utf8").replaceAll("{{VERSION}}", versionString);
      writeFileSync(langFile, stamped);
    }
  }

  static findLangFiles(dir) {
    const found = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) found.push(...Builder.findLangFiles(full));
      else if (entry.endsWith(".lang")) found.push(full);
    }
    return found;
  }

  async buildOnce() {
    this.copyPacks();
    this.stampVersion(version.read());
    await esbuild.build(this.esbuildConfig);
    console.log(`built dist/ (version ${version.read()})`);
  }

  async watch() {
    this.copyPacks();
    this.stampVersion(version.read());
    const ctx = await esbuild.context(this.esbuildConfig);
    await ctx.watch();
    console.log("watching src/ — press Ctrl+C to stop");
  }

  /**
   * Bumps the patch version, stamps it into the dist manifests + pack names,
   * and zips both packs into a single double-clickable, version-named
   * .mcaddon file. Old exports of this addon are left untouched - since the
   * version stamped inside is always higher, Minecraft imports this as an
   * upgrade of the same pack instead of a conflicting duplicate.
   */
  packageAddon() {
    const versionString = version.bumpPatch();
    this.stampVersion(versionString);

    const fileName = `${ADDON_NAME}-${versionString}.mcaddon`;
    const target = join(ROOT, fileName);
    rmSync(target, { force: true });
    execFileSync("zip", ["-r", "-q", "-X", target, "behavior_pack", "resource_pack"], {
      cwd: DIST,
      stdio: "inherit",
    });
    console.log(`packaged ${fileName} (version ${versionString})`);
    return fileName;
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
