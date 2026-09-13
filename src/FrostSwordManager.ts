import {
  EquipmentSlot,
  ItemStack,
  MolangVariableMap,
  Player,
  system,
  world,
  type Entity,
  type EntityHitEntityAfterEvent,
  type Vector3,
} from "@minecraft/server";
import { FrostSwordConfig, Identifiers } from "./config";

/** One currently-frozen target. */
interface FrozenTarget {
  readonly entity: Entity;
  ticksRemaining: number;
  ticksSinceParticles: number;
  /** Last position the target stood on solid ground, for the edge-bounce below. */
  lastGroundLocation: Vector3 | undefined;
  wasOnGround: boolean;
}

/**
 * Drives `myaddon:frost_sword`: hitting a mob or player with it in hand
 * freezes the target for `freezeDurationTicks` - not rooted in place, but
 * sliding around like it's standing on ice (frictionless), unable to jump,
 * and unable to slide off a ledge. The cooldown is per *target*, not per
 * wielder: hitting the same zombie again right after does nothing until
 * `cooldownTicks` pass, but a different zombie (or any other target) can be
 * frozen immediately regardless of when it was last used.
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
      ticksRemaining: FrostSwordConfig.freezeDurationTicks,
      ticksSinceParticles: 0,
      lastGroundLocation: target.isOnGround ? target.location : undefined,
      wasOnGround: target.isOnGround,
    });
  }

  private tick(): void {
    for (const [id, frozen] of this.frozen) {
      if (!frozen.entity.isValid) {
        this.frozen.delete(id);
        continue;
      }

      this.slideOnIce(frozen.entity);
      this.preventFallingOffLedges(frozen);

      frozen.ticksSinceParticles++;
      if (frozen.ticksSinceParticles >= FrostSwordConfig.particleIntervalTicks) {
        frozen.ticksSinceParticles = 0;
        this.drawIceShell(frozen.entity);
      }

      frozen.ticksRemaining--;
      if (frozen.ticksRemaining <= 0) this.frozen.delete(id);
    }
  }

  /** Cancels upward velocity (no jumping) and re-boosts horizontal velocity against ground friction (ice slide). */
  private slideOnIce(entity: Entity): void {
    const velocity = entity.getVelocity();
    if (velocity.y > 0) entity.applyImpulse({ x: 0, y: -velocity.y, z: 0 });

    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    if (horizontalSpeed > 0.001) {
      entity.applyImpulse({
        x: velocity.x * FrostSwordConfig.slideBoost,
        y: 0,
        z: velocity.z * FrostSwordConfig.slideBoost,
      });
    }
  }

  /** Snaps the target back the moment it slides off the edge it was standing on. */
  private preventFallingOffLedges(frozen: FrozenTarget): void {
    const { entity } = frozen;
    if (entity.isOnGround) {
      frozen.lastGroundLocation = entity.location;
      frozen.wasOnGround = true;
      return;
    }

    if (frozen.wasOnGround && frozen.lastGroundLocation) {
      entity.teleport(frozen.lastGroundLocation);
      entity.clearVelocity();
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
