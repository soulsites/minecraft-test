import {
  EntityDamageCause,
  EquipmentSlot,
  Player,
  system,
  world,
  type Dimension,
  type Entity,
  type EntitySpawnAfterEvent,
  type ProjectileHitBlockAfterEvent,
  type ProjectileHitEntityAfterEvent,
  type Vector3,
} from "@minecraft/server";
import { Identifiers, SONIC_EXPLOSION_PARTICLE, SonicBowConfig, WardenSounds } from "./config";

/** Per-shot state of one flying sonic boom. */
interface Shot {
  readonly projectile: Entity;
  readonly hitEntityIds: Set<string>;
  lastLocation: Vector3;
  traveledDistance: number;
}

/**
 * Drives `myaddon:sonic_bow`: the bow itself is pure JSON (a `minecraft:shooter`
 * firing `myaddon:echo_charge`), everything that makes the projectile behave
 * like the warden's sonic boom lives here.
 *
 * - wraps the flying arrow in the warden's own `minecraft:sonic_explosion`
 *   particle along the whole flight path
 * - deals armour-piercing damage and pierces up to `maxPierce` entities
 * - detonates into a knockback shockwave on block impact, or once it has
 *   travelled `maxTravelDistance` blocks without hitting anything
 * - charges the bow one point of durability per shot
 */
export class SonicBoomManager {
  private readonly shots = new Map<string, Shot>();

  public register(): void {
    world.afterEvents.entitySpawn.subscribe(this.onEntitySpawn);
    world.afterEvents.projectileHitEntity.subscribe(this.onHitEntity);
    world.afterEvents.projectileHitBlock.subscribe(this.onHitBlock);
    system.runInterval(() => this.tick(), 1);
  }

  private onEntitySpawn = (event: EntitySpawnAfterEvent): void => {
    const projectile = event.entity;
    if (projectile.typeId !== Identifiers.sonicBoom) return;

    this.shots.set(projectile.id, {
      projectile,
      hitEntityIds: new Set(),
      lastLocation: projectile.location,
      traveledDistance: 0,
    });

    const shooter = this.ownerOf(projectile);
    if (shooter instanceof Player) this.chargeBow(shooter);
  };

  /**
   * Advances every shot still in the air: draws the sonic boom particle at
   * its current position and, once it has covered `maxTravelDistance`
   * blocks without hitting anything, lets the shockwave dissipate there.
   */
  private tick(): void {
    for (const [id, shot] of this.shots) {
      if (!shot.projectile.isValid) {
        this.shots.delete(id);
        continue;
      }
      try {
        const location = shot.projectile.location;
        shot.traveledDistance += SonicBoomManager.distance(location, shot.lastLocation);
        shot.lastLocation = location;
        shot.projectile.dimension.spawnParticle(SONIC_EXPLOSION_PARTICLE, location);

        if (shot.traveledDistance >= SonicBowConfig.maxTravelDistance) {
          this.detonate(shot.projectile, this.ownerOf(shot.projectile));
        }
      } catch {
        // The projectile left a loaded chunk between the checks above - drop it.
        this.shots.delete(id);
      }
    }
  }

  private static distance(a: Vector3, b: Vector3): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  private ownerOf(projectile: Entity): Entity | undefined {
    return projectile.getComponent("minecraft:projectile")?.owner;
  }

  private onHitEntity = (event: ProjectileHitEntityAfterEvent): void => {
    const { projectile, source } = event;
    if (projectile.typeId !== Identifiers.sonicBoom) return;

    const shot = this.shots.get(projectile.id);
    const target = event.getEntityHit().entity;
    if (!target || target.id === source?.id) return;
    if (shot?.hitEntityIds.has(target.id)) return;

    shot?.hitEntityIds.add(target.id);
    this.hurt(target, SonicBowConfig.directDamage, source);
    this.push(target, projectile.location);

    if (shot && shot.hitEntityIds.size >= SonicBowConfig.maxPierce) {
      this.detonate(projectile, source);
    }
  };

  private onHitBlock = (event: ProjectileHitBlockAfterEvent): void => {
    const { projectile, source } = event;
    if (projectile.typeId !== Identifiers.sonicBoom) return;
    this.detonate(projectile, source);
  };

  /** Shockwave at the projectile's position, then the shot is spent. */
  private detonate(projectile: Entity, source: Entity | undefined): void {
    const { dimension, location } = projectile;
    const alreadyHit = this.shots.get(projectile.id)?.hitEntityIds ?? new Set<string>();

    this.playImpact(dimension, location);

    for (const target of this.splashTargets(dimension, location, source?.id)) {
      if (!alreadyHit.has(target.id)) this.hurt(target, SonicBowConfig.splashDamage, source);
      this.push(target, location);
    }

    this.shots.delete(projectile.id);
    if (projectile.isValid) projectile.remove();
  }

  private splashTargets(
    dimension: Dimension,
    origin: Vector3,
    shooterId: string | undefined,
  ): Entity[] {
    return dimension
      .getEntities({
        location: origin,
        maxDistance: SonicBowConfig.splashRadius,
        excludeFamilies: ["inanimate", "projectile"],
      })
      .filter((entity) => entity.id !== shooterId && entity.isValid);
  }

  /** `sonicBoom` is the one cause that ignores armour and shields. */
  private hurt(target: Entity, amount: number, source: Entity | undefined): void {
    target.applyDamage(amount, {
      cause: EntityDamageCause.sonicBoom,
      ...(source ? { damagingEntity: source } : {}),
    });
  }

  private push(target: Entity, origin: Vector3): void {
    if (!target.isValid) return;
    const dx = target.location.x - origin.x;
    const dz = target.location.z - origin.z;
    const length = Math.hypot(dx, dz) || 1;

    target.applyKnockback(
      {
        x: (dx / length) * SonicBowConfig.knockbackHorizontal,
        z: (dz / length) * SonicBowConfig.knockbackHorizontal,
      },
      SonicBowConfig.knockbackVertical,
    );
  }

  private playImpact(dimension: Dimension, location: Vector3): void {
    for (let i = 0; i < 3; i++) dimension.spawnParticle(SONIC_EXPLOSION_PARTICLE, location);
    dimension.playSound(WardenSounds.boom, location, { volume: 1.2 });
  }

  private chargeBow(shooter: Player): void {
    const equippable = shooter.getComponent("minecraft:equippable");
    const bow = equippable?.getEquipment(EquipmentSlot.Mainhand);
    if (!equippable || !bow || bow.typeId !== Identifiers.sonicBow) return;

    const durability = bow.getComponent("minecraft:durability");
    if (!durability) return;

    if (durability.damage + SonicBowConfig.durabilityCostPerShot >= durability.maxDurability) {
      equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
      shooter.dimension.playSound("random.break", shooter.location);
      return;
    }

    durability.damage += SonicBowConfig.durabilityCostPerShot;
    equippable.setEquipment(EquipmentSlot.Mainhand, bow);
  }
}
