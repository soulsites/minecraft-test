import {
  system,
  world,
  type Entity,
  type EntityHitEntityAfterEvent,
  type EntityHurtAfterEvent,
} from "@minecraft/server";
import { FrostGolemConfig, Identifiers } from "./config";

/**
 * Drives the extra behaviour of `myaddon:frost_golem` that is easier to express
 * in script than in JSON: the golem enrages once it drops below half health,
 * and briefly raises both arms whenever a melee hit lands - the same
 * arms-forward pose Iron Golems use, but driven by a custom entity property
 * instead of the iron golem's own hardcoded `variable.attack_animation_tick`
 * (that variable is populated by the engine for iron golems specifically and
 * isn't available to a custom entity).
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
