package dev.okina.companion.module;

/** A whole-number setting shown in the menu as "< value >". */
public final class NumberSetting {
    public final String id;
    public final String name;
    public final int min;
    public final int max;
    public final int step;
    private int value;

    public NumberSetting(String id, String name, int defaultValue, int min, int max, int step) {
        this.id = id;
        this.name = name;
        this.min = min;
        this.max = max;
        this.step = step;
        this.value = defaultValue;
    }

    public int get() {
        return value;
    }

    public void set(int newValue) {
        value = Math.max(min, Math.min(max, newValue));
    }

    public void increase() {
        set(value + step);
    }

    public void decrease() {
        set(value - step);
    }
}
