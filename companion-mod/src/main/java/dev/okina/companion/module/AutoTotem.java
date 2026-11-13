package dev.okina.companion.module;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.ingame.InventoryScreen;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.item.Items;
import net.minecraft.screen.slot.SlotActionType;

/** Keeps a Totem of Undying in your offhand. When one pops, the next one is moved in right away. */
public final class AutoTotem extends Module {
    /** Button number that means "swap with offhand" for SlotActionType.SWAP. */
    private static final int OFFHAND_SWAP_BUTTON = 40;

    private final NumberSetting delay;
    private int cooldown;

    public AutoTotem() {
        super("auto-totem", "AutoTotem", "Keeps a totem in your offhand");
        delay = addSetting(new NumberSetting("delay", "Delay (ticks)", 0, 0, 20, 1));
    }

    @Override
    public void onTick(MinecraftClient client) {
        ClientPlayerEntity player = client.player;
        if (player == null || client.interactionManager == null) return;
        if (cooldown > 0) {
            cooldown--;
            return;
        }
        if (player.getOffHandStack().isOf(Items.TOTEM_OF_UNDYING)) return;

        // Only touch the player's own inventory (not while a chest etc. is open).
        if (client.currentScreen != null && !(client.currentScreen instanceof InventoryScreen)) return;
        if (player.currentScreenHandler != player.playerScreenHandler) return;
        if (!player.currentScreenHandler.getCursorStack().isEmpty()) return;

        int inventorySlot = findTotem(player);
        if (inventorySlot == -1) return;

        // Player inventory slots 0-8 (hotbar) are screen slots 36-44; 9-35 keep their number.
        int screenSlot = inventorySlot < 9 ? inventorySlot + 36 : inventorySlot;
        client.interactionManager.clickSlot(
                player.playerScreenHandler.syncId, screenSlot, OFFHAND_SWAP_BUTTON, SlotActionType.SWAP, player);
        cooldown = Math.max(1, delay.get());
    }

    private static int findTotem(ClientPlayerEntity player) {
        // Check main inventory first so hotbar totems stay available for manual use.
        for (int i = 9; i < 36; i++) {
            if (player.getInventory().getStack(i).isOf(Items.TOTEM_OF_UNDYING)) return i;
        }
        for (int i = 0; i < 9; i++) {
            if (player.getInventory().getStack(i).isOf(Items.TOTEM_OF_UNDYING)) return i;
        }
        return -1;
    }
}
