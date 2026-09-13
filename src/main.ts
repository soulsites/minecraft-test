import { system } from "@minecraft/server";
import { FrostOreComponent } from "./components/FrostOreComponent";
import { FrostGolemManager } from "./FrostGolemManager";
import { FrostSwordManager } from "./FrostSwordManager";
import { SonicBoomManager } from "./SonicBoomManager";

/**
 * Entry point of the behavior pack script module.
 * Everything is wired up here so the individual classes stay testable.
 */
class Addon {
  private readonly golems = new FrostGolemManager();
  private readonly sonicBooms = new SonicBoomManager();
  private readonly frostSword = new FrostSwordManager();

  public start(): void {
    system.beforeEvents.startup.subscribe((event) => {
      event.blockComponentRegistry.registerCustomComponent(
        FrostOreComponent.componentId,
        new FrostOreComponent(),
      );
    });

    this.golems.register();
    this.sonicBooms.register();
    this.frostSword.register();
  }
}

new Addon().start();
