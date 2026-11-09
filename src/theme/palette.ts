import tokens from "./tokens.json";
export type ThemeMode = "system" | "light" | "dark";
export type ThemeName = "light" | "dark";
/** A fresh install shares onboarding's forest appearance; explicit choices win. */
export function restoreThemeMode(stored: string | null): ThemeMode {
  return stored === "light" || stored === "system" || stored === "dark" ? stored : "dark";
}
function token(name: string, theme: ThemeName): string {
  const found = tokens.color.tokens.find((t) => t.name === name);
  if (!found) throw Error(`Missing color token ${name}`);
  return found.value[theme];
}
export function getPalette(theme: ThemeName) {
  const t = (name: string) => token(name, theme);
  return {
    bg: t("surface"),
    white: t("surface-raised"),
    ink: t("ink"),
    muted: t("ink-muted"),
    green: t("pitch"),
    deep: t("pitch-deep"),
    lime: t("volt"),
    soft: t("surface-sunken"),
    pitchSoft: t("pitch-soft"),
    line: t("line"),
    lineStrong: t("line-strong"),
    danger: t("danger"),
    flare: t("flare"),
    focus: t("focus"),
    success: t("success"),
    warning: t("warning"),
    info: t("info"),
    onPrimary: t("on-pitch"),
    onLime: t("on-volt"),
    onDeep: token("on-pitch", "light"),
    onDanger: t("on-pitch"),
  };
}
export type Palette = ReturnType<typeof getPalette>;
export const palette = getPalette("light");
