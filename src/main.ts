import { system } from "@minecraft/server";
import { FrostOreComponent } from "./components/FrostOreComponent";
import { FrostWandComponent } from "./components/FrostWandComponent";
import { CrosshairGuard } from "./CrosshairGuard";
import { FrostGolemManager } from "./FrostGolemManager";
import { SonicBoomManager } from "./SonicBoomManager";

/**
 * Entry point of the behavior pack script module.
 * Everything is wired up here so the individual classes stay testable.
 */
class Addon {
  private readonly golems = new FrostGolemManager();
  private readonly sonicBooms = new SonicBoomManager();
  private readonly crosshairGuard = new CrosshairGuard();

  public start(): void {
    system.beforeEvents.startup.subscribe((event) => {
      event.itemComponentRegistry.registerCustomComponent(
        FrostWandComponent.componentId,
        new FrostWandComponent(),
      );
      event.blockComponentRegistry.registerCustomComponent(
        FrostOreComponent.componentId,
        new FrostOreComponent(),
      );
    });

    this.golems.register();
    this.sonicBooms.register();
    this.crosshairGuard.register();
  }
}

new Addon().start();
