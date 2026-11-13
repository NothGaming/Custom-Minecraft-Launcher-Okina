package dev.okina.companion;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import net.fabricmc.loader.api.FabricLoader;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Reads okina-profile.json, which Okina Launcher writes into the game folder before launching.
 * If the file is missing (game started some other way), hacks stay off and nothing is locked.
 */
public final class ProfileInfo {
    public final String profileId;
    public final String profileName;
    /** True only for profiles that allow hacks (like 2b2t). */
    public final boolean hacks;
    /** Servers this profile may join, or null for "any server". */
    public final List<String> allowedServers;

    private ProfileInfo(String profileId, String profileName, boolean hacks, List<String> allowedServers) {
        this.profileId = profileId;
        this.profileName = profileName;
        this.hacks = hacks;
        this.allowedServers = allowedServers;
    }

    public static ProfileInfo load() {
        Path file = FabricLoader.getInstance().getGameDir().resolve("okina-profile.json");
        try {
            if (!Files.exists(file)) return none();
            JsonObject json = new Gson().fromJson(Files.readString(file), JsonObject.class);
            String id = json.has("profileId") ? json.get("profileId").getAsString() : "unknown";
            String name = json.has("profileName") ? json.get("profileName").getAsString() : id;
            boolean hacks = json.has("hacks") && json.get("hacks").getAsBoolean();
            List<String> servers = null;
            if (json.has("allowedServers") && json.get("allowedServers").isJsonArray()) {
                servers = new ArrayList<>();
                for (var el : json.getAsJsonArray("allowedServers")) {
                    servers.add(el.getAsString().toLowerCase(Locale.ROOT));
                }
            }
            return new ProfileInfo(id, name, hacks, servers);
        } catch (Exception e) {
            OkinaCompanion.LOGGER.warn("Could not read okina-profile.json, hacks stay off", e);
            return none();
        }
    }

    private static ProfileInfo none() {
        return new ProfileInfo("none", "None", false, null);
    }

    /**
     * Whether this profile may join the given server address ("2b2t.org", "connect.2b2t.org:25565", ...).
     * Subdomains of an allowed server count as allowed.
     */
    public boolean isServerAllowed(String address) {
        if (allowedServers == null) return true;
        String host = stripPort(address.toLowerCase(Locale.ROOT).trim());
        for (String allowed : allowedServers) {
            String a = stripPort(allowed);
            if (host.equals(a) || host.endsWith("." + a)) return true;
        }
        return false;
    }

    private static String stripPort(String address) {
        // Leave IPv6 addresses ("[::1]:25565") alone apart from the port.
        if (address.startsWith("[")) {
            int end = address.indexOf(']');
            return end > 0 ? address.substring(1, end) : address;
        }
        int colon = address.lastIndexOf(':');
        return colon > 0 ? address.substring(0, colon) : address;
    }
}
