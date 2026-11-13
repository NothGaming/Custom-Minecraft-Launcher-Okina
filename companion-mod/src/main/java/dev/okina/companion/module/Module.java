package dev.okina.companion.module;

import net.minecraft.client.MinecraftClient;

import java.util.ArrayList;
import java.util.List;

/** Base class for every hack. Subclasses override the hooks they need. */
public abstract class Module {
    public final String id;
    public final String name;
    public final String description;
    public final List<NumberSetting> settings = new ArrayList<>();

    private boolean enabled;
    /** GLFW key code that toggles this module, or -1 for none. */
    private int key = -1;

    protected Module(String id, String name, String description) {
        this.id = id;
        this.name = name;
        this.description = description;
    }

    protected NumberSetting addSetting(NumberSetting setting) {
        settings.add(setting);
        return setting;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean value) {
        if (enabled == value) return;
        enabled = value;
        MinecraftClient client = MinecraftClient.getInstance();
        if (value) onEnable(client);
        else onDisable(client);
    }

    public void toggle() {
        setEnabled(!enabled);
    }

    public int getKey() {
        return key;
    }

    public void setKey(int key) {
        this.key = key;
    }

    /** Undo the module's changes without switching it off (used when hacks get blocked, e.g. on another server). */
    public void suspend(MinecraftClient client) {
        if (enabled) onDisable(client);
    }

    /** Called when the module is switched on. */
    protected void onEnable(MinecraftClient client) {}

    /** Called when the module is switched off, and when hacks get blocked (e.g. wrong server). Undo any changes here. */
    protected void onDisable(MinecraftClient client) {}

    /** Called every client tick while enabled and while in a world where hacks are allowed. */
    public void onTick(MinecraftClient client) {}
}
