/**
 * Single source of truth for the addon version.
 * The version lives in package.json ("version") and gets stamped from there
 * into both manifests and the visible pack names on every packaged build.
 */
import { readFileSync, writeFileSync } from "node:fs";

export class AddonVersion {
  constructor(packageJsonPath) {
    this.path = packageJsonPath;
  }

  /** Current version as "x.y.z". */
  read() {
    return JSON.parse(readFileSync(this.path, "utf8")).version;
  }

  /** Increments the patch number (1.2.3 -> 1.2.4) and persists it. */
  bumpPatch() {
    const pkg = JSON.parse(readFileSync(this.path, "utf8"));
    const [major, minor, patch] = AddonVersion.parse(pkg.version);
    pkg.version = `${major}.${minor}.${patch + 1}`;
    writeFileSync(this.path, `${JSON.stringify(pkg, null, 2)}\n`);
    return pkg.version;
  }

  static parse(version) {
    return version.split(".").map((part) => Number.parseInt(part, 10));
  }
}
