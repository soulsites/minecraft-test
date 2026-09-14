import {
  EquipmentSlot,
  Player,
  system,
  world,
  type Entity,
  type EntityHitEntityAfterEvent,
  type EntityHurtAfterEvent,
  type PlayerInteractWithEntityAfterEvent,
} from "@minecraft/server";
import { FrostGolemConfig, Identifiers } from "./config";

/**
 * Drives the extra behaviour of `myaddon:frost_golem` that is easier to express
 * in script than in JSON: the golem enrages once it drops below half health,
 * briefly raises both arms whenever a melee hit lands - the same
 * arms-forward pose Iron Golems use, but driven by a custom entity property
 * instead of the iron golem's own hardcoded `variable.attack_animation_tick`
 * (that variable is populated by the engine for iron golems specifically and
 * isn't available to a custom entity) - and lets a player earn its trust by
 * feeding it a `myaddon:frost_crystal`, after which no frost golem targets
 * that player anymore (see `FrostGolemConfig.trustScoreboardId` for why this
 * is a global flag rather than a per-golem memory).
 */
export class FrostGolemManager {
  /** Ids of golems currently in the enraged component group. */
  private readonly enraged = new Set<string>();

  public register(): void {
    this.ensureTrustObjective();

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
  }

  private ensureTrustObjective(): void {
    if (!world.scoreboard.getObjective(FrostGolemConfig.trustScoreboardId)) {
      world.scoreboard.addObjective(FrostGolemConfig.trustScoreboardId);
    }
  }

  private onPlayerInteractWithEntity = (event: PlayerInteractWithEntityAfterEvent): void => {
    if (event.target.typeId !== Identifiers.frostGolem) return;

    const player = event.player;
    const equippable = player.getComponent("minecraft:equippable");
    const held = equippable?.getEquipment(EquipmentSlot.Mainhand);
    if (!equippable || held?.typeId !== Identifiers.frostCrystal) return;

    if (this.isTrusted(player)) {
      player.sendMessage("§bDie Frost-Golems vertrauen dir bereits.");
      return;
    }

    if (held.amount > 1) {
      held.amount -= 1;
      equippable.setEquipment(EquipmentSlot.Mainhand, held);
    } else {
      equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
    }

    world.scoreboard.getObjective(FrostGolemConfig.trustScoreboardId)?.setScore(player, 1);
    event.target.dimension.spawnParticle("minecraft:snowflake_particle", event.target.location);
    event.target.dimension.playSound("random.levelup", event.target.location, { pitch: 1.4 });
    player.sendMessage("§bDie Frost-Golems greifen dich nun nicht mehr an.");
  };

  private isTrusted(player: Player): boolean {
    const objective = world.scoreboard.getObjective(FrostGolemConfig.trustScoreboardId);
    return (objective?.getScore(player) ?? 0) >= 1;
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
