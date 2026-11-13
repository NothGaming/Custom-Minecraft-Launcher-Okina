package dev.okina.companion.module;

import net.fabricmc.fabric.api.client.screen.v1.ScreenEvents;
import net.fabricmc.fabric.api.client.screen.v1.Screens;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.DisconnectedScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import net.minecraft.client.gui.screen.multiplayer.ConnectScreen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.network.ServerAddress;
import net.minecraft.client.network.ServerInfo;
import net.minecraft.text.Text;

/**
 * Rejoins the last server after you get kicked or the connection drops.
 * Adds a countdown button to the "Disconnected" screen; click it to cancel or to reconnect now.
 * The button also shows when the module is off, so you can still reconnect with one click.
 */
public final class AutoReconnect extends Module {
    private final NumberSetting delaySeconds;
    private ServerInfo lastServer;

    public AutoReconnect() {
        super("auto-reconnect", "AutoReconnect", "Rejoins after a kick");
        delaySeconds = addSetting(new NumberSetting("delay", "Delay (seconds)", 5, 1, 60, 1));
    }

    /** Called by OkinaCompanion whenever you join a server. */
    public void rememberServer(ServerInfo server) {
        if (server != null) lastServer = server;
    }

    /** Called by OkinaCompanion after every screen opens. */
    public void onScreenInit(MinecraftClient client, Screen screen, boolean hacksAllowedForLastServer) {
        if (!(screen instanceof DisconnectedScreen) || lastServer == null) return;
        ServerInfo server = lastServer;
        boolean auto = isEnabled() && hacksAllowedForLastServer;
        int[] ticksLeft = {delaySeconds.get() * 20};
        boolean[] cancelled = {!auto};

        ButtonWidget button = ButtonWidget.builder(label(server, auto, ticksLeft[0]), b -> {
            if (cancelled[0]) {
                reconnect(client, server);
            } else {
                cancelled[0] = true;
                b.setMessage(Text.literal("Reconnect to " + server.address));
            }
        }).dimensions(screen.width / 2 - 100, screen.height - 30, 200, 20).build();
        Screens.getButtons(screen).add(button);

        ScreenEvents.afterTick(screen).register(s -> {
            if (cancelled[0]) return;
            ticksLeft[0]--;
            if (ticksLeft[0] <= 0) {
                cancelled[0] = true;
                reconnect(client, server);
            } else if (ticksLeft[0] % 20 == 0) {
                button.setMessage(label(server, true, ticksLeft[0]));
            }
        });
    }

    private static Text label(ServerInfo server, boolean auto, int ticksLeft) {
        if (!auto) return Text.literal("Reconnect to " + server.address);
        return Text.literal("Reconnecting in " + (ticksLeft + 19) / 20 + "s (click to cancel)");
    }

    private static void reconnect(MinecraftClient client, ServerInfo server) {
        Screen parent = new MultiplayerScreen(new TitleScreen());
        ConnectScreen.connect(parent, client, ServerAddress.parse(server.address), server, false, null);
    }
}
