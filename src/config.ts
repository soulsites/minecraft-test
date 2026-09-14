export const NAMESPACE = "myaddon";

export const Identifiers = {
  frostSword: `${NAMESPACE}:frost_sword`,
  frostShard: `${NAMESPACE}:frost_shard`,
  frostBlock: `${NAMESPACE}:frost_block`,
  frostOre: `${NAMESPACE}:frost_ore`,
  deepslateFrostOre: `${NAMESPACE}:deepslate_frost_ore`,
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
  /** How long a hit target stays frozen in place, in ticks (3s). */
  freezeDurationTicks: 60,
  /** The ability only re-triggers this often per *target*, in ticks (1 min). */
  cooldownTicks: 1200,
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
  /**
   * Scoreboard objective the entity_types target filter in frost_golem.json
   * checks (`score < 1` = still targetable). A player fed a frost shard, or
   * who assembled a golem from a frost block + carved pumpkin, gets a score
   * of 1 here and every frost golem stops targeting them - a global "frost
   * golems trust you" flag rather than a per-golem memory, since Bedrock's
   * declarative target filter has no way to reference a specific
   * golem-player relationship, only global entity state.
   */
  trustScoreboardId: "myaddon_frost_trust",
  /** The block, topped with a carved pumpkin, that spawns a frost golem. */
  buildPumpkinBlockId: "minecraft:carved_pumpkin",
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
 * them for the result on confirmation - only these recipes, nothing else.
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
  {
    label: "Frostschwert (1x Netherit-Schwert + 8x Eissplitter)",
    ingredients: [
      { itemId: "minecraft:netherite_sword", count: 1 },
      { itemId: Identifiers.frostShard, count: 8 },
    ],
    result: { itemId: Identifiers.frostSword, count: 1 },
  },
];
