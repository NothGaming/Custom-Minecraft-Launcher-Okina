package dev.okina.companion;

import net.minecraft.client.MinecraftClient;
import org.lwjgl.glfw.GLFW;

/**
 * Reads the keyboard directly with GLFW. This avoids Minecraft's keybinding classes,
 * which change between versions, and lets keys work the same in-game and in the menu.
 */
public final class Keys {
    public static final int MENU_KEY = GLFW.GLFW_KEY_RIGHT_SHIFT;
    private static final boolean[] wasDown = new boolean[GLFW.GLFW_KEY_LAST + 1];

    private Keys() {}

    public static boolean isDown(int key) {
        if (key < 0 || key > GLFW.GLFW_KEY_LAST) return false;
        long window = MinecraftClient.getInstance().getWindow().getHandle();
        return GLFW.glfwGetKey(window, key) == GLFW.GLFW_PRESS;
    }

    /** True only on the tick the key goes down. Call once per key per tick. */
    public static boolean justPressed(int key) {
        if (key < 0 || key > GLFW.GLFW_KEY_LAST) return false;
        boolean down = isDown(key);
        boolean pressed = down && !wasDown[key];
        wasDown[key] = down;
        return pressed;
    }

    /** First key that went down this tick, or -1. Used when picking a keybind. */
    public static int anyJustPressed() {
        int found = -1;
        for (int key = GLFW.GLFW_KEY_SPACE; key <= GLFW.GLFW_KEY_LAST; key++) {
            if (justPressed(key) && found == -1) found = key;
        }
        return found;
    }

    public static String name(int key) {
        if (key < 0) return "none";
        return switch (key) {
            case GLFW.GLFW_KEY_RIGHT_SHIFT -> "RShift";
            case GLFW.GLFW_KEY_LEFT_SHIFT -> "LShift";
            case GLFW.GLFW_KEY_RIGHT_CONTROL -> "RCtrl";
            case GLFW.GLFW_KEY_LEFT_CONTROL -> "LCtrl";
            case GLFW.GLFW_KEY_RIGHT_ALT -> "RAlt";
            case GLFW.GLFW_KEY_LEFT_ALT -> "LAlt";
            case GLFW.GLFW_KEY_SPACE -> "Space";
            case GLFW.GLFW_KEY_TAB -> "Tab";
            case GLFW.GLFW_KEY_ENTER -> "Enter";
            case GLFW.GLFW_KEY_UP -> "Up";
            case GLFW.GLFW_KEY_DOWN -> "Down";
            case GLFW.GLFW_KEY_LEFT -> "Left";
            case GLFW.GLFW_KEY_RIGHT -> "Right";
            case GLFW.GLFW_KEY_INSERT -> "Insert";
            case GLFW.GLFW_KEY_HOME -> "Home";
            case GLFW.GLFW_KEY_END -> "End";
            case GLFW.GLFW_KEY_PAGE_UP -> "PgUp";
            case GLFW.GLFW_KEY_PAGE_DOWN -> "PgDn";
            default -> {
                if (key >= GLFW.GLFW_KEY_F1 && key <= GLFW.GLFW_KEY_F25) yield "F" + (key - GLFW.GLFW_KEY_F1 + 1);
                String name = GLFW.glfwGetKeyName(key, 0);
                yield name != null ? name.toUpperCase() : "Key " + key;
            }
        };
    }
}
