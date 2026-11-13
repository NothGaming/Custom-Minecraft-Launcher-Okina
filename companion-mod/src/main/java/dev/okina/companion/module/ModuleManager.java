package dev.okina.companion.module;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import dev.okina.companion.OkinaCompanion;
import net.fabricmc.loader.api.FabricLoader;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Holds every module and saves their on/off state, keybinds and settings to
 * config/okina-companion.json (inside the profile's game folder, so each profile has its own).
 */
public final class ModuleManager {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    public final Fullbright fullbright = new Fullbright();
    public final AutoTotem autoTotem = new AutoTotem();
    public final AutoEat autoEat = new AutoEat();
    public final AutoReconnect autoReconnect = new AutoReconnect();

    public final List<Module> all = List.of(fullbright, autoTotem, autoEat, autoReconnect);

    private final Path file = FabricLoader.getInstance().getConfigDir().resolve("okina-companion.json");

    public void load() {
        if (!Files.exists(file)) return;
        try {
            JsonObject root = GSON.fromJson(Files.readString(file), JsonObject.class);
            for (Module module : all) {
                if (!root.has(module.id)) continue;
                JsonObject json = root.getAsJsonObject(module.id);
                if (json.has("key")) module.setKey(json.get("key").getAsInt());
                for (NumberSetting setting : module.settings) {
                    if (json.has(setting.id)) setting.set(json.get(setting.id).getAsInt());
                }
                // Set enabled last so onEnable sees the loaded settings.
                if (json.has("enabled") && json.get("enabled").getAsBoolean()) module.setEnabled(true);
            }
        } catch (Exception e) {
            OkinaCompanion.LOGGER.warn("Could not read okina-companion.json, using defaults", e);
        }
    }

    public void save() {
        JsonObject root = new JsonObject();
        for (Module module : all) {
            JsonObject json = new JsonObject();
            json.addProperty("enabled", module.isEnabled());
            json.addProperty("key", module.getKey());
            for (NumberSetting setting : module.settings) json.addProperty(setting.id, setting.get());
            root.add(module.id, json);
        }
        try {
            Files.createDirectories(file.getParent());
            Files.writeString(file, GSON.toJson(root));
        } catch (Exception e) {
            OkinaCompanion.LOGGER.warn("Could not save okina-companion.json", e);
        }
    }

    public Module byKey(int key) {
        for (Module module : all) if (module.getKey() == key) return module;
        return null;
    }
}
