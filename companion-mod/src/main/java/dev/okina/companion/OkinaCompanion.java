package dev.okina.companion;

import dev.okina.companion.gui.OkinaMenuScreen;
import dev.okina.companion.module.Module;
import dev.okina.companion.module.ModuleManager;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.fabricmc.fabric.api.client.screen.v1.ScreenEvents;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ServerInfo;
import net.minecraft.text.Text;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Okina companion mod.
 *
 * Hacks only run when BOTH are true:
 *  1. the launcher profile allows hacks ("hacks": true in okina-profile.json), and
 *  2. you're in singleplayer or on a server the profile allows (e.g. 2b2t.org).
 * If the profile has a server lock, joining any other server is blocked.
 */
public final class OkinaCompanion implements ClientModInitializer {
    public static final Logger LOGGER = LoggerFactory.getLogger("okina");
    private static OkinaCompanion instance;

    public ProfileInfo profile;
    public final ModuleManager modules = new ModuleManager();
    /** Address of the server we're on, or null in singleplayer / menus. */
    private String currentServer;
    private boolean hacksActive;

    public static OkinaCompanion get() {
        return instance;
    }

    @Override
    public void onInitializeClient() {
        instance = this;
        profile = ProfileInfo.load();
        LOGGER.info("Okina profile: {} (hacks: {}, allowed servers: {})",
                profile.profileName, profile.hacks, profile.allowedServers);
        if (profile.hacks) modules.load();

        ClientPlayConnectionEvents.JOIN.register((handler, sender, client) -> {
            ServerInfo server = client.getCurrentServerEntry();
            currentServer = client.isInSingleplayer() || server == null ? null : server.address;

            if (currentServer != null && !profile.isServerAllowed(currentServer)) {
                LOGGER.info("Blocked joining {} (profile is locked to {})", currentServer, profile.allowedServers);
                handler.getConnection().disconnect(Text.literal(
                        "Okina: the \"" + profile.profileName + "\" profile can only join "
                                + String.join(", ", profile.allowedServers)
                                + ".\nSwitch profiles in the launcher to play on other servers."));
                return;
            }
            modules.autoReconnect.rememberServer(server);
        });

        ClientPlayConnectionEvents.DISCONNECT.register((handler, client) -> currentServer = null);

        ScreenEvents.AFTER_INIT.register((client, screen, width, height) -> {
            if (profile.hacks) modules.autoReconnect.onScreenInit(client, screen, true);
        });

        ClientTickEvents.END_CLIENT_TICK.register(this::tick);
    }

    /** Whether hacks may run right now (also used by the menu). */
    public boolean hacksAllowedHere() {
        if (!profile.hacks) return false;
        return currentServer == null || profile.isServerAllowed(currentServer);
    }

    private void tick(MinecraftClient client) {
        if (!profile.hacks) return;

        // Open the menu with Right Shift (only when no other screen is open).
        if (Keys.justPressed(Keys.MENU_KEY) && client.currentScreen == null) {
            client.setScreen(new OkinaMenuScreen());
        }

        boolean inWorld = client.player != null && client.world != null;
        boolean shouldBeActive = inWorld && hacksAllowedHere();

        // When hacks get blocked, give every module a chance to undo its changes.
        if (hacksActive && !shouldBeActive) {
            for (Module module : modules.all) module.suspend(client);
        }
        hacksActive = shouldBeActive;
        if (!shouldBeActive) return;

        // Module keybinds work in-game only (not while typing in chat etc.).
        if (client.currentScreen == null) {
            for (Module module : modules.all) {
                if (Keys.justPressed(module.getKey())) {
                    module.toggle();
                    client.player.sendMessage(Text.literal("§d[Okina]§r " + module.name + ": "
                            + (module.isEnabled() ? "§aON" : "§cOFF")), true);
                    modules.save();
                }
            }
        }

        for (Module module : modules.all) {
            if (module.isEnabled()) {
                try {
                    module.onTick(client);
                } catch (Exception e) {
                    LOGGER.error("{} crashed and was turned off", module.name, e);
                    module.setEnabled(false);
                }
            }
        }
    }
}
