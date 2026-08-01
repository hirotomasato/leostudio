import { describe, expect, it } from "vitest";
import { LOCALE_STORAGE_KEY, resolveLocale, translate } from "./i18n";

describe("i18n locale selection", () => {
  it("defaults unsupported and missing locale values to English", () => {
    expect(resolveLocale(null)).toBe("en");
    expect(resolveLocale("fr")).toBe("en");
  });

  it("selects Simplified Chinese and translates representative UI text", () => {
    expect(resolveLocale("zh-CN")).toBe("zh-CN");
    expect(translate("zh-CN", "Generate Image")).toBe("生成图片");
    expect(translate("zh-CN", "Prompt cannot be empty.")).toBe("提示词不能为空。");
  });

  it("falls back to English source text for missing translations", () => {
    expect(translate("zh-CN", "Untranslated label")).toBe("Untranslated label");
    expect(translate("en", "Generate Image")).toBe("Generate Image");
  });

  it("uses a stable local persistence key", () => {
    expect(LOCALE_STORAGE_KEY).toBe("leostudio-locale");
  });
});
