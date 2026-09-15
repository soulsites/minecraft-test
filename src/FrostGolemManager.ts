import {
  system,
  world,
  type DataDrivenEntityTriggerAfterEvent,
  type Entity,
  type EntityHitEntityAfterEvent,
  type EntityHurtAfterEvent,
  type EntitySpawnAfterEvent,
  type EntityTameableComponent,
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
 * isn't available to a custom entity) - and lets a player earn *that specific
 * golem's* trust, either by feeding it a `myaddon:frost_shard` or by building
 * it from a `myaddon:frost_block` topped with a carved pumpkin (like a
 * vanilla snow/iron golem). This rides on `frost_golem.json`'s own
 * `minecraft:tameable` component (the same mechanism wolves use for bones) so
 * each golem remembers its own owner via the engine's real per-entity
 * ownership - not a global flag, so other, un-fed golems keep attacking that
 * player as expected.
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
    world.afterEvents.dataDrivenEntityTrigger.subscribe(this.onTame, {
      entityTypes: [Identifiers.frostGolem],
      eventTypes: [FrostGolemConfig.tameEventName],
    });
    world.afterEvents.playerPlaceBlock.subscribe(this.onPlayerPlaceBlock, {
      blockTypes: [FrostGolemConfig.buildPumpkinBlockId],
    });
    world.afterEvents.entitySpawn.subscribe(this.onEntitySpawn);
  }

  /**
   * `runtime_identifier: "minecraft:zombie"` in frost_golem.json (reused so
   * the engine still handles baseline mechanics like hurt knockback and
   * hitboxes for us) makes death messages say "Zombie" instead of
   * "Frostgolem", ignoring the entity's own `entity.myaddon:frost_golem.name`
   * lang entry - Bedrock's kill-feed text is keyed off the runtime type, not
   * the custom identifier. Giving the entity a name tag sidesteps this: a
   * named entity's death message uses that name instead of the type name,
   * exactly like naming a zombie with a name tag changes its death message.
   * Only sets a default - a player's own name tag (via nameable) is left
   * alone.
   */
  private onEntitySpawn = (event: EntitySpawnAfterEvent): void => {
    const golem = event.entity;
    if (golem.isValid && golem.typeId === Identifiers.frostGolem && !golem.nameTag) {
      golem.nameTag = "Frostgolem";
    }
  };

  /**
   * Feeding a frost shard is handled entirely by the `minecraft:tameable`
   * component (item consumption, the interact prompt, setting ownership) -
   * this just reacts to the `tame_event` it fires afterwards for feedback.
   */
  private onTame = (event: DataDrivenEntityTriggerAfterEvent): void => {
    const golem = event.entity;
    if (!golem.isValid) return;

    const owner = this.tameableComponent(golem)?.tamedToPlayer;
    if (!owner) return;

    golem.dimension.spawnParticle("minecraft:snowflake_particle", golem.location);
    golem.dimension.playSound("random.levelup", golem.location, { pitch: 1.4 });
    owner.sendMessage("§bDieser Frost-Golem greift dich nun nicht mehr an.");
  };

  /**
   * A carved pumpkin placed directly on a frost block spawns a frost golem
   * there - the same "build it like a snow/iron golem" idea, just with a
   * single block instead of a taller stack/cross, as asked for. Both
   * blocks are consumed, like vanilla's golems consume theirs, and the
   * builder becomes this specific golem's owner via the same tameable
   * component feeding uses.
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

    this.tameableComponent(golem)?.tame(event.player);
    event.dimension.spawnParticle("minecraft:snowflake_particle", golem.location);
    event.player.sendMessage("§bDu hast einen Frost-Golem erschaffen. Er greift dich nicht an.");
  };

  private tameableComponent(golem: Entity): EntityTameableComponent | undefined {
    return golem.getComponent("minecraft:tameable");
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
