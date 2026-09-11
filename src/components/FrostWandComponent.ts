import {
  EntityDamageCause,
  EquipmentSlot,
  MolangVariableMap,
  Player,
  system,
  type Dimension,
  type Entity,
  type ItemComponentUseEvent,
  type ItemCustomComponent,
  type Vector3,
} from "@minecraft/server";
import { FrostWandConfig, Identifiers } from "../config";

/**
 * Custom component of `myaddon:frost_wand`.
 * On use it freezes every nearby mob and costs one point of durability.
 */
export class FrostWandComponent implements ItemCustomComponent {
  public static readonly componentId = Identifiers.frostWand;

  /** Player id -> tick at which the wand may be used again. */
  private readonly readyAtTick = new Map<string, number>();

  public onUse = (event: ItemComponentUseEvent): void => {
    const player = event.source;
    if (!(player instanceof Player)) return;
    if (this.isOnCooldown(player)) return;

    this.startCooldown(player);

    const targets = this.findTargets(player.dimension, player.location, player.id);
    for (const target of targets) this.freeze(target);

    this.playCastEffects(player.dimension, player.location);
    player.onScreenDisplay.setActionBar(`§bFrost Nova §7(${targets.length})`);
    this.consumeDurability(player);
  };

  private isOnCooldown(player: Player): boolean {
    return system.currentTick < (this.readyAtTick.get(player.id) ?? 0);
  }

  private startCooldown(player: Player): void {
    this.readyAtTick.set(player.id, system.currentTick + FrostWandConfig.cooldownTicks);
  }

  private findTargets(dimension: Dimension, origin: Vector3, casterId: string): Entity[] {
    return dimension
      .getEntities({
        location: origin,
        maxDistance: FrostWandConfig.radius,
        excludeFamilies: ["inanimate"],
      })
      .filter((entity) => entity.id !== casterId && entity.isValid);
  }

  private freeze(target: Entity): void {
    target.addEffect("slowness", FrostWandConfig.slownessDurationTicks, {
      amplifier: FrostWandConfig.slownessAmplifier,
      showParticles: true,
    });
    target.applyDamage(1, { cause: EntityDamageCause.freezing });
  }

  private playCastEffects(dimension: Dimension, origin: Vector3): void {
    const variables = new MolangVariableMap();
    variables.setColorRGB("variable.color", { red: 0.6, green: 0.85, blue: 1 });
    dimension.spawnParticle("minecraft:snowflake_particle", origin, variables);
    dimension.playSound("random.glass", origin, { pitch: 1.4 });
  }

  private consumeDurability(player: Player): void {
    const equippable = player.getComponent("minecraft:equippable");
    const item = equippable?.getEquipment(EquipmentSlot.Mainhand);
    const durability = item?.getComponent("minecraft:durability");
    if (!equippable || !item || !durability) return;

    durability.damage = Math.min(
      durability.maxDurability,
      durability.damage + FrostWandConfig.durabilityCostPerCast,
    );
    equippable.setEquipment(EquipmentSlot.Mainhand, item);
  }
}
