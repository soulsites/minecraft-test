import { system } from "@minecraft/server";
import { FrostOreComponent } from "./components/FrostOreComponent";
import { FrostWandComponent } from "./components/FrostWandComponent";
import { FrostGolemManager } from "./FrostGolemManager";

/**
 * Entry point of the behavior pack script module.
 * Everything is wired up here so the individual classes stay testable.
 */
class Addon {
  private readonly golems = new FrostGolemManager();

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
  }
}

new Addon().start();
