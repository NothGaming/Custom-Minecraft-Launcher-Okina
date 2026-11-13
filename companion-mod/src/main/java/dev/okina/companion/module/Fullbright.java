package dev.okina.companion.module;

import net.minecraft.client.MinecraftClient;
import net.minecraft.entity.effect.StatusEffectInstance;
import net.minecraft.entity.effect.StatusEffects;

/**
 * See in the dark. Gives the player a client-side Night Vision effect that never runs out.
 * Only you see it; the server doesn't know.
 */
public final class Fullbright extends Module {
    public Fullbright() {
        super("fullbright", "Fullbright", "See in the dark");
    }

    @Override
    public void onTick(MinecraftClient client) {
        if (client.player == null) return;
        StatusEffectInstance current = client.player.getStatusEffect(StatusEffects.NIGHT_VISION);
        // Re-add if missing or if the server replaced it with a normal, timed effect.
        if (current == null || !current.isInfinite()) {
            client.player.addStatusEffect(new StatusEffectInstance(
                    StatusEffects.NIGHT_VISION, StatusEffectInstance.INFINITE, 0, false, false, false));
        }
    }

    @Override
    protected void onDisable(MinecraftClient client) {
        if (client.player == null) return;
        StatusEffectInstance current = client.player.getStatusEffect(StatusEffects.NIGHT_VISION);
        // Only remove our own infinite effect, not a real Night Vision potion.
        if (current != null && current.isInfinite()) {
            client.player.removeStatusEffect(StatusEffects.NIGHT_VISION);
        }
    }
}
