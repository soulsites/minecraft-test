import {
  EntityDamageCause,
  EquipmentSlot,
  ItemStack,
  MolangVariableMap,
  Player,
  system,
  world,
  type Entity,
  type EntityHitEntityAfterEvent,
  type EntityHurtAfterEvent,
  type Vector3,
} from "@minecraft/server";
import { FrostSwordConfig, Identifiers } from "./config";

/** One currently-frozen target. */
interface FrozenTarget {
  readonly entity: Entity;
  /** Position it gets pinned back to every tick - works for any mob, flying or not. */
  readonly anchor: Vector3;
  /** The tick freeze() was first called - lets the triggering hit through untouched. */
  readonly frozenSinceTick: number;
  ticksRemaining: number;
  ticksSinceParticles: number;
  /** Damage taken while frozen, healed back instantly and released all at once on thaw. */
  bufferedDamage: number;
}

/**
 * Drives `myaddon:frost_sword`: hitting a mob or player with it in hand
 * freezes the target in place for `freezeDurationTicks` - pinned to the spot
 * every tick regardless of its own AI/knockback/flight (works the same for
 * every mob, not just ground-walkers), unable to move at all. Any damage it
 * takes while frozen is healed back instantly (so its health bar doesn't
 * move) and buffered; the moment the freeze ends, the entire buffered
 * total is dealt at once. The cooldown is per *target*, not per wielder.
 */
export class FrostSwordManager {
  private readonly frozen = new Map<string, FrozenTarget>();
  /**
   * Target entity id -> tick at which that target can be frozen again.
   * Entries are never purged (only ever a few bytes each, bounded by how
   * many distinct entities were ever hit this session) - not worth the
   * bookkeeping to clean up.
   */
  private readonly readyAtTick = new Map<string, number>();

  public register(): void {
    world.afterEvents.entityHitEntity.subscribe(this.onEntityHitEntity);
    world.afterEvents.entityHurt.subscribe(this.onEntityHurt);
    system.runInterval(() => this.tick(), 1);
  }

  private onEntityHitEntity = (event: EntityHitEntityAfterEvent): void => {
    const attacker = event.damagingEntity;
    if (!(attacker instanceof Player)) return;

    const weapon = attacker.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand);
    if (weapon?.typeId !== Identifiers.frostSword) return;

    const target = event.hitEntity;
    if (this.isOnCooldown(target)) return;

    this.startCooldown(target);
    this.freeze(target);
    this.chargeSword(attacker, weapon);
  };

  /** Heals back and buffers any damage a frozen target takes, instead of letting it apply immediately. */
  private onEntityHurt = (event: EntityHurtAfterEvent): void => {
    const frozen = this.frozen.get(event.hurtEntity.id);
    if (!frozen) return;
    // Let the very hit that triggers the freeze through untouched.
    if (system.currentTick <= frozen.frozenSinceTick) return;

    const health = frozen.entity.getComponent("minecraft:health");
    if (!health) return;

    health.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + event.damage));
    frozen.bufferedDamage += event.damage;

    // Any hit also gives a knockback impulse the instant it lands, well
    // before the next scheduled tick() below would catch it - correcting
    // position/velocity right here too closes that gap, so a hit while
    // frozen doesn't visibly nudge the target at all.
    frozen.entity.teleport(frozen.anchor);
    frozen.entity.clearVelocity();
  };

  private isOnCooldown(target: Entity): boolean {
    return system.currentTick < (this.readyAtTick.get(target.id) ?? 0);
  }

  private startCooldown(target: Entity): void {
    this.readyAtTick.set(target.id, system.currentTick + FrostSwordConfig.cooldownTicks);
  }

  private freeze(target: Entity): void {
    if (!target.isValid) return;

    const existing = this.frozen.get(target.id);
    if (existing) {
      existing.ticksRemaining = FrostSwordConfig.freezeDurationTicks;
      return;
    }

    this.frozen.set(target.id, {
      entity: target,
      anchor: target.location,
      frozenSinceTick: system.currentTick,
      ticksRemaining: FrostSwordConfig.freezeDurationTicks,
      ticksSinceParticles: 0,
      bufferedDamage: 0,
    });
  }

  private tick(): void {
    for (const [id, frozen] of this.frozen) {
      if (!frozen.entity.isValid) {
        this.frozen.delete(id);
        continue;
      }

      frozen.entity.teleport(frozen.anchor);
      frozen.entity.clearVelocity();

      frozen.ticksSinceParticles++;
      if (frozen.ticksSinceParticles >= FrostSwordConfig.particleIntervalTicks) {
        frozen.ticksSinceParticles = 0;
        this.drawIceShell(frozen.entity);
      }

      frozen.ticksRemaining--;
      if (frozen.ticksRemaining <= 0) this.thaw(id, frozen);
    }
  }

  /** Removes the freeze and, if any damage was buffered, deals it all at once. */
  private thaw(id: string, frozen: FrozenTarget): void {
    this.frozen.delete(id);
    if (frozen.bufferedDamage > 0 && frozen.entity.isValid) {
      frozen.entity.applyDamage(frozen.bufferedDamage, { cause: EntityDamageCause.override });
    }
  }

  /**
   * Two rings of snow/ice particles wrapping the target's body (near the
   * feet and near the head) - the closest real substitute for "the target's
   * texture turns light blue". Bedrock has no way to recolor an arbitrary,
   * already-existing entity's texture at runtime: a render controller's
   * overlay/tint only applies to entities whose client entity file we
   * define ourselves (works for our own `frost_golem`, not for an
   * arbitrary vanilla mob or a player the sword happens to hit), and there
   * is no generic "tint any entity" API in `@minecraft/server` either.
   */
  private drawIceShell(target: Entity): void {
    const { x, y, z } = target.location;
    const variables = new MolangVariableMap();
    variables.setColorRGB("variable.color", { red: 0.7, green: 0.9, blue: 1 });

    const points = 6;
    const radius = 0.5;
    for (const height of [0.2, 1.1]) {
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const px = x + Math.cos(angle) * radius;
        const pz = z + Math.sin(angle) * radius;
        target.dimension.spawnParticle("minecraft:snowflake_particle", { x: px, y: y + height, z: pz }, variables);
      }
    }
  }

  private chargeSword(player: Player, sword: ItemStack): void {
    const equippable = player.getComponent("minecraft:equippable");
    const durability = sword.getComponent("minecraft:durability");
    if (!equippable || !durability) return;

    if (durability.damage + FrostSwordConfig.durabilityCostPerHit >= durability.maxDurability) {
      equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
      player.dimension.playSound("random.break", player.location);
      return;
    }

    durability.damage += FrostSwordConfig.durabilityCostPerHit;
    equippable.setEquipment(EquipmentSlot.Mainhand, sword);
  }
}
