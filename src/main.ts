import { system } from "@minecraft/server";
import { FrostOreComponent } from "./components/FrostOreComponent";
import { FrostGolemManager } from "./FrostGolemManager";
import { FrostSwordManager } from "./FrostSwordManager";
import { HammerMenu } from "./HammerMenu";
import { SonicBoomManager } from "./SonicBoomManager";

/**
 * Bedrock's script environment provides a real `console` global (visible in
 * the Content Log) - the TypeScript lib just doesn't declare it since this
 * project targets ES2022 without the DOM/node lib that normally would.
 */
declare const console: { error(...args: unknown[]): void };

/**
 * Entry point of the behavior pack script module.
 * Everything is wired up here so the individual classes stay testable.
 */
class Addon {
  private readonly golems = new FrostGolemManager();
  private readonly sonicBooms = new SonicBoomManager();
  private readonly frostSword = new FrostSwordManager();
  private readonly hammerMenu = new HammerMenu();

  public start(): void {
    system.beforeEvents.startup.subscribe((event) => {
      event.blockComponentRegistry.registerCustomComponent(
        FrostOreComponent.componentId,
        new FrostOreComponent(),
      );
    });

    // Each manager is registered independently: an exception thrown while
    // registering one (as happened once - a world-mutating call fired
    // too early during script load) used to abort every registration
    // after it in this list too, silently disabling the rest of the addon.
    // Isolating them means a bug in one manager can never again take the
    // others down with it.
    this.registerSafely("FrostGolemManager", () => this.golems.register());
    this.registerSafely("SonicBoomManager", () => this.sonicBooms.register());
    this.registerSafely("FrostSwordManager", () => this.frostSword.register());
    this.registerSafely("HammerMenu", () => this.hammerMenu.register());
  }

  private registerSafely(name: string, register: () => void): void {
    try {
      register();
    } catch (error) {
      console.error(`[myaddon] ${name}.register() failed - that feature is disabled: ${error}`);
    }
  }
}

new Addon().start();
