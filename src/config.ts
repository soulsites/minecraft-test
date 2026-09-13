export const NAMESPACE = "myaddon";

export const Identifiers = {
  frostSword: `${NAMESPACE}:frost_sword`,
  frostShard: `${NAMESPACE}:frost_shard`,
  frostOre: `${NAMESPACE}:frost_ore`,
  frostGolem: `${NAMESPACE}:frost_golem`,
  sonicBow: `${NAMESPACE}:sonic_bow`,
  echoCharge: `${NAMESPACE}:echo_charge`,
  sonicBoom: `${NAMESPACE}:sonic_boom`,
  wardenIngot: `${NAMESPACE}:warden_ingot`,
  wardenHammer: `${NAMESPACE}:warden_hammer`,
} as const;

/** The warden's own sonic boom particle - real vanilla content, not a custom one. */
export const SONIC_EXPLOSION_PARTICLE = "minecraft:sonic_explosion";

/** The warden's own sonic boom / charge sound events. */
export const WardenSounds = {
  charge: "mob.warden.sonic_charge",
  boom: "mob.warden.sonic_boom",
} as const;

export const FrostSwordConfig = {
  /** How long a hit target stays frozen, in ticks. */
  freezeDurationTicks: 100,
  /**
   * Slowness amplifier applied for the duration. Speed scales down by
   * (1 - 0.15 * amplifier), which already floors at 0 well before this -
   * kept high for headroom against enchantments/effects that might
   * otherwise counteract it. `clearVelocity()` on top handles the part
   * slowness alone doesn't cover: knockback/momentum already in flight.
   */
  slownessAmplifier: 10,
  /**
   * The icy "shell" is drawn as a ring of particles around the target,
   * refreshed every N ticks rather than every tick - the same throttling
   * SonicBoomManager uses for its trail, for the same reason (a particle
   * ring redrawn 20x/sec per frozen target is exactly the kind of thing
   * that caused real, measurable lag earlier in this addon).
   */
  particleIntervalTicks: 5,
  durabilityCostPerHit: 1,
} as const;

export const FrostGolemConfig = {
  /** Below this share of max health the golem enrages. */
  enrageHealthRatio: 0.5,
  enrageEventName: `${NAMESPACE}:enrage`,
  calmEventName: `${NAMESPACE}:calm`,
  /** Custom entity property driving the arms-forward attack pose. */
  attackingPropertyId: "myaddon:attacking",
  /** How long the arms-forward pose holds after a melee hit lands, in ticks. */
  attackPoseTicks: 10,
} as const;

export const SonicBowConfig = {
  /** Damage of a direct hit. Bypasses armour like the warden's sonic boom. */
  directDamage: 40,
  /** Damage dealt to everything else inside the impact radius. */
  splashDamage: 20,
  /** Radius in blocks of the shockwave on impact. */
  splashRadius: 3.5,
  /** Horizontal / vertical knockback of the shockwave. */
  knockbackHorizontal: 1.6,
  knockbackVertical: 0.55,
  /** How many entities one shot can pierce before it stops. */
  maxPierce: 4,
  /** Durability spent per shot. */
  durabilityCostPerShot: 1,
  /** The shockwave dissipates on its own after travelling this far. */
  maxTravelDistance: 50,
  /**
   * Trail particles are spawned only every N ticks (not every tick) to keep
   * a slow, long-lived, potentially multi-shot effect from flooding the
   * client with particles and causing lag - the particle's own 0.8s
   * lifetime still keeps the trail visually continuous at this rate.
   */
  trailSpawnIntervalTicks: 4,
} as const;
