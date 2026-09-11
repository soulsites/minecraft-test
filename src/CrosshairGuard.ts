import { HudElement, HudVisibility, world } from "@minecraft/server";
import { Identifiers } from "./config";

/**
 * Touch controls normally show an aiming reticle while a bow is drawn. If
 * anything ever force-hides the crosshair HUD element, that reticle would
 * disappear too - this makes sure it is explicitly reset to visible for the
 * whole time a player is drawing `myaddon:sonic_bow`.
 */
export class CrosshairGuard {
  public register(): void {
    world.afterEvents.itemStartUse.subscribe((event) => {
      if (event.itemStack.typeId !== Identifiers.sonicBow) return;
      event.source.onScreenDisplay.setHudVisibility(HudVisibility.Reset, [HudElement.Crosshair]);
    });
  }
}
