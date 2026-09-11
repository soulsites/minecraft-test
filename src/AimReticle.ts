import { HudElement, HudVisibility, Player, world } from "@minecraft/server";
import { Identifiers } from "./config";

/**
 * Touch controls show a native aiming reticle while a *real* vanilla bow is
 * drawn, but that UI is hardcoded to the vanilla item and never appears for
 * `myaddon:sonic_bow` (confirmed: bedrock-samples' hud_screen.json has no
 * data-driven binding for it at all). As a substitute, this draws a plain
 * cross in the middle of the screen for as long as the sonic bow is drawn,
 * using the title display - the only screen-center overlay the Script API
 * can actually draw text into.
 */
export class AimReticle {
  private static readonly GLYPH = "+";

  /** Comfortably longer than the bow's own max draw duration (24 ticks). */
  private static readonly STAY_DURATION_TICKS = 40;

  public register(): void {
    world.afterEvents.itemStartUse.subscribe((event) => {
      if (event.itemStack.typeId !== Identifiers.sonicBow) return;
      this.show(event.source);
    });
    world.afterEvents.itemReleaseUse.subscribe((event) => this.hide(event.source));
    world.afterEvents.itemStopUse.subscribe((event) => this.hide(event.source));
  }

  private show(player: Player): void {
    // Guard against anything having force-hidden the normal crosshair too.
    player.onScreenDisplay.setHudVisibility(HudVisibility.Reset, [HudElement.Crosshair]);
    player.onScreenDisplay.setTitle(AimReticle.GLYPH, {
      fadeInDuration: 0,
      fadeOutDuration: 0,
      stayDuration: AimReticle.STAY_DURATION_TICKS,
    });
  }

  private hide(player: Player): void {
    player.onScreenDisplay.setTitle("", { fadeInDuration: 0, fadeOutDuration: 0, stayDuration: 0 });
  }
}
