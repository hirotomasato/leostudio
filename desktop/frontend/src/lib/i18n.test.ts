import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  I18nProvider,
  LOCALE_STORAGE_KEY,
  persistLocale,
  readStoredLocale,
  resolveLocale,
  translate,
  useTranslation,
} from "./i18n";

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

  it("restores and updates the locally persisted preference", () => {
    const values = new Map<string, string>([[LOCALE_STORAGE_KEY, "zh-CN"]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(readStoredLocale(storage)).toBe("zh-CN");
    persistLocale(storage, "en");
    expect(values.get(LOCALE_STORAGE_KEY)).toBe("en");
  });

  it("renders representative UI in the selected locale", () => {
    const values = new Map<string, string>([[LOCALE_STORAGE_KEY, "zh-CN"]]);
    const previousStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: (key: string) => values.get(key) ?? null },
    });

    function RepresentativeUI() {
      const { t } = useTranslation();
      return createElement("button", { "aria-label": t("Generate Image") }, t("Prompt"));
    }

    try {
      expect(renderToStaticMarkup(
        createElement(I18nProvider, null, createElement(RepresentativeUI))
      )).toContain('aria-label="生成图片">提示词');
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousStorage,
      });
    }
  });
});
