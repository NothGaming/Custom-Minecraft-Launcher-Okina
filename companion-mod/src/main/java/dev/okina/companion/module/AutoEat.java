package dev.okina.companion.module;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.component.DataComponentTypes;
import net.minecraft.component.type.FoodComponent;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;

import java.util.Set;

/**
 * Eats when your hunger drops. Picks the most filling food in your hotbar, holds right click
 * until you're full enough, then switches back to the slot you had.
 */
public final class AutoEat extends Module {
    /** Foods with bad side effects. Never eaten automatically. */
    private static final Set<Item> BLOCKED = Set.of(
            Items.ROTTEN_FLESH, Items.SPIDER_EYE, Items.POISONOUS_POTATO, Items.PUFFERFISH,
            Items.CHORUS_FRUIT, Items.SUSPICIOUS_STEW, Items.CHICKEN);

    private final NumberSetting hungerThreshold;
    private boolean eating;
    private int previousSlot = -1;

    public AutoEat() {
        super("auto-eat", "AutoEat", "Eats when you get hungry");
        // Food bar is 0-20 (each drumstick = 2).
        hungerThreshold = addSetting(new NumberSetting("hunger", "Eat below (0-20)", 14, 1, 19, 1));
    }

    @Override
    public void onTick(MinecraftClient client) {
        ClientPlayerEntity player = client.player;
        if (player == null) return;
        int food = player.getHungerManager().getFoodLevel();

        if (eating) {
            boolean full = food >= 20 || food > hungerThreshold.get() + 4;
            if (full || !isEdible(player.getMainHandStack()) || client.currentScreen != null) {
                stop(client);
            } else {
                client.options.useKey.setPressed(true);
            }
            return;
        }

        if (food > hungerThreshold.get() || client.currentScreen != null || player.isUsingItem()) return;
        if (player.getAbilities().creativeMode) return;

        int slot = findBestFood(player);
        if (slot == -1) return;

        previousSlot = player.getInventory().getSelectedSlot();
        player.getInventory().setSelectedSlot(slot);
        client.options.useKey.setPressed(true);
        eating = true;
    }

    @Override
    protected void onDisable(MinecraftClient client) {
        if (eating) stop(client);
    }

    private void stop(MinecraftClient client) {
        client.options.useKey.setPressed(false);
        if (client.player != null && previousSlot >= 0) {
            client.player.getInventory().setSelectedSlot(previousSlot);
        }
        previousSlot = -1;
        eating = false;
    }

    private static int findBestFood(ClientPlayerEntity player) {
        int best = -1;
        int bestNutrition = 0;
        for (int i = 0; i < 9; i++) {
            ItemStack stack = player.getInventory().getStack(i);
            if (!isEdible(stack)) continue;
            FoodComponent food = stack.get(DataComponentTypes.FOOD);
            if (food != null && food.nutrition() > bestNutrition) {
                best = i;
                bestNutrition = food.nutrition();
            }
        }
        return best;
    }

    private static boolean isEdible(ItemStack stack) {
        if (stack.isEmpty() || BLOCKED.contains(stack.getItem())) return false;
        // Keep enchanted golden apples for emergencies.
        if (stack.isOf(Items.ENCHANTED_GOLDEN_APPLE)) return false;
        return stack.get(DataComponentTypes.FOOD) != null;
    }
}
