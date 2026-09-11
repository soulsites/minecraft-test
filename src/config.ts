export const NAMESPACE = "myaddon";

export const Identifiers = {
  frostWand: `${NAMESPACE}:frost_wand`,
  frostShard: `${NAMESPACE}:frost_shard`,
  frostOre: `${NAMESPACE}:frost_ore`,
  frostGolem: `${NAMESPACE}:frost_golem`,
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
