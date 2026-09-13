import {
  EquipmentSlot,
  ItemStack,
  MolangVariableMap,
  Player,
  system,
  world,
  type Entity,
  type EntityHitEntityAfterEvent,
} from "@minecraft/server";
import { FrostSwordConfig, Identifiers } from "./config";

/** One currently-frozen target. */
interface FrozenTarget {
  readonly entity: Entity;
  ticksRemaining: number;
  ticksSinceParticles: number;
}

/**
 * Drives `myaddon:frost_sword`: hitting a mob or player with it in hand
 * freezes the target in place - a heavy Slowness effect plus a per-tick
 * `clearVelocity()` (Slowness alone doesn't cancel momentum already in
 * flight, e.g. from knockback) - wrapped in a shell of ice/snow particles
 * for the "encased in ice" look. Works identically on mobs and players;
 * Bedrock has no way to actually attach an ice-block mesh to an arbitrary
 * entity (attachables only apply to the wielder's own equipped items), so
 * the particle shell is the closest real approximation, not a literal cage.
 */
export class FrostSwordManager {
  private readonly frozen = new Map<string, FrozenTarget>();

  public register(): void {
    world.afterEvents.entityHitEntity.subscribe(this.onEntityHitEntity);
    system.runInterval(() => this.tick(), 1);
  }

  private onEntityHitEntity = (event: EntityHitEntityAfterEvent): void => {
    const attacker = event.damagingEntity;
    if (!(attacker instanceof Player)) return;

    const weapon = attacker.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand);
    if (weapon?.typeId !== Identifiers.frostSword) return;

    this.freeze(event.hitEntity);
    this.chargeSword(attacker, weapon);
  };

  private freeze(target: Entity): void {
    if (!target.isValid) return;

    target.addEffect("slowness", FrostSwordConfig.freezeDurationTicks, {
      amplifier: FrostSwordConfig.slownessAmplifier,
      showParticles: false,
    });

    const existing = this.frozen.get(target.id);
    if (existing) {
      existing.ticksRemaining = FrostSwordConfig.freezeDurationTicks;
    } else {
      this.frozen.set(target.id, {
        entity: target,
        ticksRemaining: FrostSwordConfig.freezeDurationTicks,
        ticksSinceParticles: 0,
      });
    }
  }

  private tick(): void {
    for (const [id, frozen] of this.frozen) {
      if (!frozen.entity.isValid) {
        this.frozen.delete(id);
        continue;
      }

      frozen.entity.clearVelocity();
      frozen.ticksRemaining--;

      frozen.ticksSinceParticles++;
      if (frozen.ticksSinceParticles >= FrostSwordConfig.particleIntervalTicks) {
        frozen.ticksSinceParticles = 0;
        this.drawIceShell(frozen.entity);
      }

      if (frozen.ticksRemaining <= 0) this.frozen.delete(id);
    }
  }

  /** A small ring of snow/ice particles around the target's body. */
  private drawIceShell(target: Entity): void {
    const { x, y, z } = target.location;
    const variables = new MolangVariableMap();
    variables.setColorRGB("variable.color", { red: 0.7, green: 0.9, blue: 1 });

    const points = 6;
    const radius = 0.5;
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const px = x + Math.cos(angle) * radius;
      const pz = z + Math.sin(angle) * radius;
      target.dimension.spawnParticle("minecraft:snowflake_particle", { x: px, y: y + 0.9, z: pz }, variables);
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
