package dev.okina.companion.gui;

import dev.okina.companion.Keys;
import dev.okina.companion.OkinaCompanion;
import dev.okina.companion.module.Module;
import dev.okina.companion.module.NumberSetting;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.tooltip.Tooltip;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import org.lwjgl.glfw.GLFW;

/**
 * The Okina menu (Right Shift). One row per module:
 *   [ON/OFF  name]  [key: X]  [<] setting [>] ...
 * Click "key" then press a key to bind it; Backspace or Delete clears it.
 */
public final class OkinaMenuScreen extends Screen {
    private static final int ROW_HEIGHT = 24;
    private static final int WHITE = 0xFFFFFFFF;
    private static final int GRAY = 0xFFAAAAAA;
    private static final int PURPLE = 0xFFB98CFF;

    private Module bindingModule;

    public OkinaMenuScreen() {
        super(Text.literal("Okina"));
    }

    @Override
    protected void init() {
        OkinaCompanion mod = OkinaCompanion.get();
        int top = 40;

        if (!mod.hacksAllowedHere()) {
            addDrawableChild(ButtonWidget.builder(Text.literal("Close"), b -> close())
                    .dimensions(width / 2 - 50, height / 2 + 20, 100, 20).build());
            return;
        }

        int y = top;
        for (Module module : mod.modules.all) {
            int x = width / 2 - 200;

            addDrawableChild(ButtonWidget.builder(toggleLabel(module), b -> {
                module.toggle();
                b.setMessage(toggleLabel(module));
                mod.modules.save();
            }).dimensions(x, y, 140, 20).tooltip(Tooltip.of(Text.literal(module.description))).build());

            addDrawableChild(ButtonWidget.builder(keyLabel(module), b -> {
                bindingModule = module;
                Keys.anyJustPressed(); // clear keys that are already down (the mouse click doesn't count, but just in case)
                b.setMessage(Text.literal("press a key…"));
            }).dimensions(x + 145, y, 80, 20).build());

            int sx = x + 230;
            for (NumberSetting setting : module.settings) {
                addDrawableChild(ButtonWidget.builder(Text.literal("<"), b -> {
                    setting.decrease();
                    mod.modules.save();
                }).dimensions(sx, y, 20, 20).build());
                addDrawableChild(ButtonWidget.builder(Text.literal(">"), b -> {
                    setting.increase();
                    mod.modules.save();
                }).dimensions(sx + 150, y, 20, 20).build());
                sx += 175;
            }
            y += ROW_HEIGHT;
        }

        addDrawableChild(ButtonWidget.builder(Text.literal("Done"), b -> close())
                .dimensions(width / 2 - 50, y + 10, 100, 20).build());
    }

    @Override
    public void tick() {
        if (bindingModule == null) return;
        int key = Keys.anyJustPressed();
        if (key == -1) return;
        if (key == GLFW.GLFW_KEY_BACKSPACE || key == GLFW.GLFW_KEY_DELETE) key = -1;
        if (key == Keys.MENU_KEY) key = -1; // the menu key can't also toggle a module
        bindingModule.setKey(key);
        bindingModule = null;
        OkinaCompanion.get().modules.save();
        clearAndInit();
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        super.render(context, mouseX, mouseY, delta);
        OkinaCompanion mod = OkinaCompanion.get();
        context.drawCenteredTextWithShadow(textRenderer, Text.literal("Okina · " + mod.profile.profileName), width / 2, 15, PURPLE);

        if (!mod.hacksAllowedHere()) {
            String reason = mod.profile.hacks
                    ? "Hacks are off on this server."
                    : "Hacks are only available in profiles that allow them (like 2b2t).";
            context.drawCenteredTextWithShadow(textRenderer, Text.literal(reason), width / 2, height / 2 - 10, WHITE);
            return;
        }

        // Setting names and values between the < > buttons.
        int y = 40;
        for (Module module : mod.modules.all) {
            int sx = width / 2 - 200 + 230;
            for (NumberSetting setting : module.settings) {
                context.drawCenteredTextWithShadow(textRenderer,
                        Text.literal(setting.name + ": " + setting.get()), sx + 85, y + 6, GRAY);
                sx += 175;
            }
            y += ROW_HEIGHT;
        }
    }

    @Override
    public boolean shouldPause() {
        return false;
    }

    private static Text toggleLabel(Module module) {
        return Text.literal((module.isEnabled() ? "§aON §r" : "§cOFF §r") + module.name);
    }

    private static Text keyLabel(Module module) {
        return Text.literal("key: " + Keys.name(module.getKey()));
    }
}
