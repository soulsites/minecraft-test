import {
  EntityDamageCause,
  EquipmentSlot,
  Player,
  system,
  world,
  type Dimension,
  type Entity,
  type ProjectileHitBlockAfterEvent,
  type ProjectileHitEntityAfterEvent,
  type Vector2,
  type Vector3,
} from "@minecraft/server";
import { Identifiers, SONIC_EXPLOSION_PARTICLE, SonicBowConfig, WardenSounds } from "./config";

/** All dimensions the shot-discovery scan below has to cover. */
const DIMENSION_IDS = ["overworld", "nether", "the_end"] as const;

/** Per-shot state of one flying sonic boom. */
interface Shot {
  readonly projectile: Entity;
  readonly hitEntityIds: Set<string>;
  lastLocation: Vector3;
  traveledDistance: number;
  ticksSinceTrail: number;
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
 *
 * Shots are discovered by polling for `myaddon:sonic_boom` entities once a
 * tick instead of subscribing to `world.afterEvents.entitySpawn` - that event
 * has no type filter and fires for *every* entity spawning anywhere in the
 * world (mob farms, dropped items, XP orbs, ...), which meant a script
 * callback ran on every single one of those just to throw almost all of them
 * away. `getEntities({ type })` is filtered natively and only ever returns
 * our own projectiles.
 */
export class SonicBoomManager {
  private readonly shots = new Map<string, Shot>();

  public register(): void {
    world.afterEvents.projectileHitEntity.subscribe(this.onHitEntity);
    world.afterEvents.projectileHitBlock.subscribe(this.onHitBlock);
    system.runInterval(() => this.tick(), 1);
  }

  /** Picks up any `myaddon:sonic_boom` that appeared since the last tick. */
  private discoverNewShots(): void {
    for (const dimensionId of DIMENSION_IDS) {
      const dimension = world.getDimension(dimensionId);
      for (const projectile of dimension.getEntities({ type: Identifiers.sonicBoom })) {
        if (this.shots.has(projectile.id)) continue;

        this.shots.set(projectile.id, {
          projectile,
          hitEntityIds: new Set(),
          lastLocation: projectile.location,
          traveledDistance: 0,
          ticksSinceTrail: 0,
        });

        const shooter = this.ownerOf(projectile);
        if (shooter instanceof Player) this.chargeBow(shooter);
      }
    }
  }

  /**
   * Advances every shot still in the air: forces its model to face its
   * actual velocity, wraps its current position in the warden's sonic boom
   * particle and, once it has covered `maxTravelDistance` blocks without
   * hitting anything, lets the shockwave dissipate there.
   */
  private tick(): void {
    this.discoverNewShots();

    for (const [id, shot] of this.shots) {
      if (!shot.projectile.isValid) {
        this.shots.delete(id);
        continue;
      }
      try {
        const location = shot.projectile.location;
        const heading = SonicBoomManager.subtract(location, shot.lastLocation);
        shot.traveledDistance += SonicBoomManager.length(heading);
        shot.lastLocation = location;

        this.faceVelocity(shot.projectile);

        shot.ticksSinceTrail++;
        if (shot.ticksSinceTrail >= SonicBowConfig.trailSpawnIntervalTicks) {
          shot.ticksSinceTrail = 0;
          this.drawSonicBoomSlice(shot.projectile.dimension, location, heading);
        }

        if (shot.traveledDistance >= SonicBowConfig.maxTravelDistance) {
          this.detonate(shot.projectile, this.ownerOf(shot.projectile));
        }
      } catch {
        // The projectile left a loaded chunk between the checks above - drop it.
        this.shots.delete(id);
      }
    }
  }

  /**
   * Forces the projectile's model to point along its actual velocity,
   * regardless of which compass direction that is. The engine's own
   * rotate-to-velocity behaviour for this custom projectile turned out to
   * only line up for some headings and flip the model backwards for
   * others - this computes yaw/pitch directly from the real velocity vector
   * every tick instead of trusting that.
   */
  private faceVelocity(projectile: Entity): void {
    const rotation = SonicBoomManager.rotationFromVelocity(projectile.getVelocity());
    if (rotation) projectile.setRotation(rotation);
  }

  /** Standard Minecraft yaw/pitch (in degrees) pointing along `velocity`. */
  private static rotationFromVelocity(velocity: Vector3): Vector2 | undefined {
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    if (horizontalSpeed < 1e-4 && Math.abs(velocity.y) < 1e-4) return undefined;

    const yaw = (Math.atan2(-velocity.x, velocity.z) * 180) / Math.PI;
    const pitch = (Math.atan2(-velocity.y, horizontalSpeed) * 180) / Math.PI;
    return { x: pitch, y: yaw };
  }

  /**
   * Spawns the warden's own particle in a small cross-section perpendicular
   * to the flight direction, so the arrow sits inside a wider traveling tube
   * of sonic booms instead of a single thin trail of dots. Kept to 3
   * particles (not a full 5-point cross) and only called every
   * `trailSpawnIntervalTicks` ticks - a slow, long-lived shot spawning a
   * full cross every single tick is what made this laggy before.
   */
  private drawSonicBoomSlice(dimension: Dimension, center: Vector3, heading: Vector3): void {
    dimension.spawnParticle(SONIC_EXPLOSION_PARTICLE, center);

    const { right, up } = SonicBoomManager.perpendicularAxes(heading);
    const radius = 0.4;
    dimension.spawnParticle(SONIC_EXPLOSION_PARTICLE, SonicBoomManager.offset(center, right, radius));
    dimension.spawnParticle(SONIC_EXPLOSION_PARTICLE, SonicBoomManager.offset(center, up, -radius));
  }

  /** Two unit vectors perpendicular to `direction` (and to each other). */
  private static perpendicularAxes(direction: Vector3): { right: Vector3; up: Vector3 } {
    const forward = SonicBoomManager.normalize(direction);
    const worldUp = Math.abs(forward.y) > 0.99 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const right = SonicBoomManager.normalize(SonicBoomManager.cross(forward, worldUp));
    const up = SonicBoomManager.cross(right, forward);
    return { right, up };
  }

  private static cross(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  private static normalize(v: Vector3): Vector3 {
    const length = SonicBoomManager.length(v) || 1;
    return { x: v.x / length, y: v.y / length, z: v.z / length };
  }

  private static offset(origin: Vector3, axis: Vector3, amount: number): Vector3 {
    return { x: origin.x + axis.x * amount, y: origin.y + axis.y * amount, z: origin.z + axis.z * amount };
  }

  private static subtract(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  private static length(v: Vector3): number {
    return Math.hypot(v.x, v.y, v.z);
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
