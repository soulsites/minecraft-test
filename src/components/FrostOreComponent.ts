import {
  Player,
  type BlockComponentPlayerBreakEvent,
  type BlockCustomComponent,
} from "@minecraft/server";
import { Identifiers } from "../config";

/**
 * Custom component of `myaddon:frost_ore`.
 * Mining the ore chills the miner and leaves a puff of snow behind.
 */
export class FrostOreComponent implements BlockCustomComponent {
  public static readonly componentId = Identifiers.frostOre;

  public onPlayerBreak = (event: BlockComponentPlayerBreakEvent): void => {
    const { block, dimension, player } = event;
    const center = {
      x: block.location.x + 0.5,
      y: block.location.y + 0.5,
      z: block.location.z + 0.5,
    };

    dimension.spawnParticle("minecraft:snowflake_particle", center);
    dimension.playSound("random.glass", center, { pitch: 0.8 });

    if (player instanceof Player) {
      player.addEffect("slowness", 60, { amplifier: 0, showParticles: false });
    }
  };
}
