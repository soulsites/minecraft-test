export const NAMESPACE = "myaddon";

export const Identifiers = {
  frostWand: `${NAMESPACE}:frost_wand`,
  frostShard: `${NAMESPACE}:frost_shard`,
  frostOre: `${NAMESPACE}:frost_ore`,
  frostGolem: `${NAMESPACE}:frost_golem`,
  sonicBow: `${NAMESPACE}:sonic_bow`,
  echoCharge: `${NAMESPACE}:echo_charge`,
  sonicBoom: `${NAMESPACE}:sonic_boom`,
} as const;

export const Particles = {
  sonicTrail: `${NAMESPACE}:sonic_ring`,
  sonicImpact: `${NAMESPACE}:sonic_impact`,
} as const;

export const FrostWandConfig = {
  /** Radius in blocks affected by one cast. */
  radius: 4,
  /** Ticks the slowness effect lasts. */
  slownessDurationTicks: 120,
  slownessAmplifier: 2,
  /** Cooldown between two casts, in ticks. */
  cooldownTicks: 40,
  durabilityCostPerCast: 1,
} as const;

export const FrostGolemConfig = {
  /** Below this share of max health the golem enrages. */
  enrageHealthRatio: 0.5,
  enrageEventName: `${NAMESPACE}:enrage`,
  calmEventName: `${NAMESPACE}:calm`,
} as const;

export const SonicBowConfig = {
  /** Damage of a direct hit. Bypasses armour like the warden's sonic boom. */
  directDamage: 10,
  /** Damage dealt to everything else inside the impact radius. */
  splashDamage: 5,
  /** Radius in blocks of the shockwave on impact. */
  splashRadius: 3.5,
  /** Horizontal / vertical knockback of the shockwave. */
  knockbackHorizontal: 1.6,
  knockbackVertical: 0.55,
  /** How many entities one shot can pierce before it stops. */
  maxPierce: 4,
  /** Durability spent per shot. */
  durabilityCostPerShot: 1,
} as const;
