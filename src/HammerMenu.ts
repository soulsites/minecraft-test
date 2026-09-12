import { Container, ItemStack, Player, system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { ANVIL_BLOCK_ID, HammerRecipeConfig, HammerRecipes, Identifiers } from "./config";

/**
 * Turns the Hammer into a tool: right-clicking an anvil while holding it
 * opens a custom crafting menu instead of the vanilla rename/repair/enchant
 * UI. The anvil's real UI is hard-coded and can't host an item-slot grid, so
 * this is a button menu with exactly the two recipes below - nothing else
 * is craftable through it, and the vanilla anvil still works normally when
 * the Hammer isn't in hand.
 */
export class HammerMenu {
  public register(): void {
    world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
      if (event.block.typeId !== ANVIL_BLOCK_ID) return;
      if (event.itemStack?.typeId !== Identifiers.wardenHammer) return;

      event.cancel = true;
      const player = event.player;
      system.run(() => this.openMenu(player));
    });
  }

  private openMenu(player: Player): void {
    const form = new ActionFormData().title("Hammer").body("Was möchtest du herstellen?");
    for (const recipe of HammerRecipes) form.button(recipe.label);

    form.show(player).then((response) => {
      if (response.canceled || response.selection === undefined) return;
      this.craft(player, HammerRecipes[response.selection]);
    });
  }

  private craft(player: Player, recipe: HammerRecipeConfig): void {
    const inventory = player.getComponent("minecraft:inventory")?.container;
    if (!inventory) return;

    if (!this.hasIngredients(inventory, recipe)) {
      player.sendMessage("§cDir fehlen die Zutaten dafür.");
      return;
    }

    this.removeIngredients(inventory, recipe);
    const leftover = inventory.addItem(new ItemStack(recipe.result.itemId, recipe.result.count));
    if (leftover) player.dimension.spawnItem(leftover, player.location);
    player.sendMessage(`§aHergestellt.`);
  }

  private hasIngredients(inventory: Container, recipe: HammerRecipeConfig): boolean {
    return recipe.ingredients.every(
      (ingredient) => this.countItem(inventory, ingredient.itemId) >= ingredient.count,
    );
  }

  private countItem(inventory: Container, itemId: string): number {
    let total = 0;
    for (let slot = 0; slot < inventory.size; slot++) {
      const stack = inventory.getItem(slot);
      if (stack?.typeId === itemId) total += stack.amount;
    }
    return total;
  }

  private removeIngredients(inventory: Container, recipe: HammerRecipeConfig): void {
    for (const ingredient of recipe.ingredients) {
      let remaining = ingredient.count;
      for (let slot = 0; slot < inventory.size && remaining > 0; slot++) {
        const stack = inventory.getItem(slot);
        if (stack?.typeId !== ingredient.itemId) continue;

        const taken = Math.min(remaining, stack.amount);
        remaining -= taken;
        if (taken === stack.amount) {
          inventory.setItem(slot, undefined);
        } else {
          stack.amount -= taken;
          inventory.setItem(slot, stack);
        }
      }
    }
  }
}
