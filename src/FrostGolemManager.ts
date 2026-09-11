import { world, type Entity, type EntityHurtAfterEvent } from "@minecraft/server";
import { FrostGolemConfig, Identifiers } from "./config";

/**
 * Drives the extra behaviour of `myaddon:frost_golem` that is easier to express
 * in script than in JSON: the golem enrages once it drops below half health.
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
  }

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
