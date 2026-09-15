import {
  Player,
  system,
  world,
  type Entity,
  type EntityHitEntityAfterEvent,
  type EntityHurtAfterEvent,
  type PlayerInteractWithEntityAfterEvent,
  type PlayerPlaceBlockAfterEvent,
} from "@minecraft/server";
import { FrostGolemConfig, Identifiers } from "./config";

/**
 * Drives the extra behaviour of `myaddon:frost_golem` that is easier to express
 * in script than in JSON: the golem enrages once it drops below half health,
 * briefly raises both arms whenever a melee hit lands - the same
 * arms-forward pose Iron Golems use, but driven by a custom entity property
 * instead of the iron golem's own hardcoded `variable.attack_animation_tick`
 * (that variable is populated by the engine for iron golems specifically and
 * isn't available to a custom entity) - and lets a player earn its trust,
 * either by feeding an existing golem a `myaddon:frost_shard` or by building
 * one from a `myaddon:frost_block` topped with a carved pumpkin (like a
 * vanilla snow/iron golem). Either way no frost golem targets that player
 * anymore afterwards (see `FrostGolemConfig.trustScoreboardId` for why this
 * is a global flag rather than a per-golem memory).
 */
export class FrostGolemManager {
  /** Ids of golems currently in the enraged component group. */
  private readonly enraged = new Set<string>();

  public register(): void {
    world.afterEvents.entityHurt.subscribe(this.onEntityHurt, {
      entityTypes: [Identifiers.frostGolem],
    });
    world.afterEvents.entityDie.subscribe(
      ({ deadEntity }) => this.enraged.delete(deadEntity.id),
      { entityTypes: [Identifiers.frostGolem] },
    );
    world.afterEvents.entityHitEntity.subscribe(this.onEntityHitEntity, {
      entityTypes: [Identifiers.frostGolem],
    });
    world.afterEvents.playerInteractWithEntity.subscribe(this.onPlayerInteractWithEntity);
    world.afterEvents.playerPlaceBlock.subscribe(this.onPlayerPlaceBlock, {
      blockTypes: [FrostGolemConfig.buildPumpkinBlockId],
    });
  }

  /**
   * Feeding an existing golem a frost shard earns the same trust as building
   * one. The actual shard consumption is handled by `frost_golem.json`'s
   * `minecraft:interact` component (`use_item: true`) - the same way vanilla
   * feeds a cow or sheds a sheep - so `event.beforeItemStack` here is just
   * confirming what was consumed, not doing the consuming itself.
   */
  private onPlayerInteractWithEntity = (event: PlayerInteractWithEntityAfterEvent): void => {
    if (event.target.typeId !== Identifiers.frostGolem) return;
    if (event.beforeItemStack?.typeId !== Identifiers.frostShard) return;

    const player = event.player;
    if (this.isTrusted(player)) {
      player.sendMessage("§bDie Frost-Golems vertrauen dir bereits.");
      return;
    }

    this.grantTrust(player);
    event.target.dimension.spawnParticle("minecraft:snowflake_particle", event.target.location);
    event.target.dimension.playSound("random.levelup", event.target.location, { pitch: 1.4 });
    player.sendMessage("§bDie Frost-Golems greifen dich nun nicht mehr an.");
  };

  /**
   * A carved pumpkin placed directly on a frost block spawns a frost golem
   * there - the same "build it like a snow/iron golem" idea, just with a
   * single block instead of a taller stack/cross, as asked for. Both
   * blocks are consumed, like vanilla's golems consume theirs.
   */
  private onPlayerPlaceBlock = (event: PlayerPlaceBlockAfterEvent): void => {
    const base = event.block.below();
    if (base?.typeId !== Identifiers.frostBlock) return;

    const spawnLocation = event.block.location;
    base.setType("minecraft:air");
    event.block.setType("minecraft:air");

    const golem = event.dimension.spawnEntity(Identifiers.frostGolem, {
      x: spawnLocation.x + 0.5,
      y: spawnLocation.y - 1,
      z: spawnLocation.z + 0.5,
    });

    this.grantTrust(event.player);
    event.dimension.spawnParticle("minecraft:snowflake_particle", golem.location);
    event.player.sendMessage("§bDu hast einen Frost-Golem erschaffen. Er greift dich nicht an.");
  };

  private grantTrust(player: Player): void {
    player.addTag(FrostGolemConfig.trustTagId);
  }

  private isTrusted(player: Player): boolean {
    return player.hasTag(FrostGolemConfig.trustTagId);
  }

  private onEntityHitEntity = (event: EntityHitEntityAfterEvent): void => {
    const golem = event.damagingEntity;
    // The entityTypes filter above matches on either side of the hit, so
    // this still needs to be checked explicitly - only the golem's own
    // swing should raise its arms, not merely getting hit by one.
    if (!golem.isValid || golem.typeId !== Identifiers.frostGolem) return;

    golem.setProperty(FrostGolemConfig.attackingPropertyId, true);
    system.runTimeout(() => {
      if (golem.isValid) golem.setProperty(FrostGolemConfig.attackingPropertyId, false);
    }, FrostGolemConfig.attackPoseTicks);
  };

  private onEntityHurt = (event: EntityHurtAfterEvent): void => {
    const golem = event.hurtEntity;
    if (!golem.isValid) return;

    const healthRatio = this.healthRatio(golem);
    if (healthRatio === undefined) return;

    if (healthRatio <= FrostGolemConfig.enrageHealthRatio) {
      this.enrage(golem);
    } else {
      this.calm(golem);
    }
  };

  private healthRatio(golem: Entity): number | undefined {
    const health = golem.getComponent("minecraft:health");
    if (!health || health.effectiveMax <= 0) return undefined;
    return health.currentValue / health.effectiveMax;
  }

  private enrage(golem: Entity): void {
    if (this.enraged.has(golem.id)) return;
    this.enraged.add(golem.id);
    golem.triggerEvent(FrostGolemConfig.enrageEventName);
    golem.dimension.playSound("mob.irongolem.hit", golem.location, { pitch: 0.6 });
  }

  private calm(golem: Entity): void {
    if (!this.enraged.delete(golem.id)) return;
    golem.triggerEvent(FrostGolemConfig.calmEventName);
  }
}
