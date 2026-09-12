export const NAMESPACE = "myaddon";

export const Identifiers = {
  frostWand: `${NAMESPACE}:frost_wand`,
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

/** One recipe offered by the Hammer's anvil menu. */
export interface HammerRecipeConfig {
  /** Label shown as the menu button. */
  label: string;
  ingredients: { itemId: string; count: number }[];
  result: { itemId: string; count: number };
}

/**
 * The anvil block. Right-clicking it while holding the Hammer opens the
 * custom menu below instead of the vanilla rename/repair/enchant UI.
 */
export const ANVIL_BLOCK_ID = "minecraft:anvil";

/**
 * The Hammer's own crafting menu, opened on an anvil. Bedrock's anvil UI is
 * hard-coded and can't host a real item-slot grid, so this is a button menu
 * that checks the player's inventory for the listed ingredients and swaps
 * them for the result on confirmation - the only two recipes it offers.
 */
export const HammerRecipes: HammerRecipeConfig[] = [
  {
    label: "Schallbogen (1x Bogen + 1x Warden-Barren)",
    ingredients: [
      { itemId: "minecraft:bow", count: 1 },
      { itemId: Identifiers.wardenIngot, count: 1 },
    ],
    result: { itemId: Identifiers.sonicBow, count: 1 },
  },
  {
    label: "Echoladung (1x Pfeil + 1x Echosplitter)",
    ingredients: [
      { itemId: "minecraft:arrow", count: 1 },
      { itemId: "minecraft:echo_shard", count: 1 },
    ],
    result: { itemId: Identifiers.echoCharge, count: 1 },
  },
];
