import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "zh-CN";
export const LOCALE_STORAGE_KEY = "leostudio-locale";

// English is deliberately the source and fallback locale. Keep API values,
// model names, and backend error messages outside this catalog.
const zh: Record<string, string> = {
  "Workspace": "工作区", "Manage": "管理", "Generate Image": "生成图片", "Generate Video": "生成视频", "Queue": "队列", "Library": "素材库", "Cookies": "Cookie", "Models": "模型", "Settings": "设置", "About": "关于",
  "Collapse sidebar": "收起侧边栏", "Expand sidebar": "展开侧边栏", "Light theme": "浅色主题", "Dark theme": "深色主题", "System theme": "跟随系统主题", "credits": "积分",
  "Language": "语言", "Choose the display language for LeoStudio.": "选择 LeoStudio 的显示语言。", "English": "English", "Simplified Chinese": "简体中文", "Language saved": "语言已保存",
  "Default aspect ratio": "默认宽高比", "Default image model": "默认图片模型", "Auto-save": "自动保存", "Save outputs to disk": "将生成结果保存到磁盘", "Choose folder": "选择文件夹", "Open folder": "打开文件夹", "Save": "保存", "Saved": "已保存", "Add or sync a model first.": "请先添加或同步模型。",
  "Compose": "创作", "Compose image": "创作图片", "Compose video": "创作视频", "Prompt": "提示词", "Model": "模型", "Aspect ratio": "宽高比", "Quantity": "数量", "Reference": "参考图", "Result": "结果", "Generate": "生成", "Generating...": "正在生成...", "Ready to generate": "准备生成", "Generated images appear here.": "生成的图片将显示在这里。", "Generated video appears here.": "生成的视频将显示在这里。", "No model": "没有模型", "Preview": "预览", "Preview image": "预览图片", "Open fullscreen preview": "打开全屏预览", "Open": "打开", "Rendering {duration}s clip": "正在渲染 {duration} 秒视频", "Resolution": "分辨率", "Duration": "时长", "Native audio": "原生音频", "Start frame": "起始帧", "optional": "可选", "No video model registered": "尚未注册视频模型",
  "Drag image here": "将图片拖到这里", "Choose file": "选择文件", "Paste URL": "粘贴 URL", "Use": "使用", "Cancel": "取消", "Uploading…": "正在上传…", "Remove reference": "移除参考图", "Reference image": "参考图片", "Remote URL": "远程 URL", "Uploaded": "已上传",
  "Add cookie": "添加 Cookie", "Cookie pool": "Cookie 池", "Validating": "正在验证", "Add": "添加", "Refresh": "刷新", "Update cookie": "更新 Cookie", "Update": "更新", "Active balance": "可用积分", "Ready accounts": "可用账户", "Depleted": "已耗尽", "Disabled": "已禁用", "Ready": "可用", "Active": "已启用", "Disable": "禁用", "Enable": "启用", "Edit cookie": "编辑 Cookie", "Delete cookie": "删除 Cookie", "No cookies": "没有 Cookie", "balance": "积分", "last checked": "上次检查",
  "Image": "图片", "Video": "视频", "Sync": "同步", "Name": "名称", "Model UUID": "模型 UUID", "Default": "默认", "No image models": "没有图片模型", "Sync from Leonardo": "从 Leonardo 同步", "audio": "音频", "ref image": "参考图", "Model UUID required": "需要模型 UUID", "Model added": "模型已添加",
  "All": "全部", "Search prompt, model, gen id…": "搜索提示词、模型或生成 ID…", "Use prompt": "使用提示词", "Pause": "暂停", "Play": "播放", "Open fullscreen": "打开全屏", "No results": "没有结果", "Try changing the filter or clearing the search box.": "请更改筛选条件或清除搜索框。",
  "Add to queue": "加入队列", "Drafts": "草稿", "Submit": "提交", "Clear finished": "清除已完成", "Duplicate draft": "复制草稿", "Remove draft": "移除草稿", "Preview result": "预览结果", "Cancel job": "取消任务", "Retry job": "重试任务", "pending": "等待中", "running": "运行中", "completed": "已完成", "failed": "失败", "canceled": "已取消", "Queue is empty": "队列为空", "No drafts yet. Compose a request, then click \"Add to queue\".": "还没有草稿。创建请求后点击“加入队列”。", "Submitted jobs appear here.": "已提交的任务将显示在这里。",
  "Author": "作者", "License": "许可证", "Built with": "构建技术", "Repository": "代码仓库", "Close": "关闭", "dismiss": "关闭通知",
  "Prompt cannot be empty.": "提示词不能为空。", "Select a model first.": "请先选择模型。", "Load failed": "加载失败", "Auto-save failed": "自动保存失败", "Saved {count} file": "已保存 {count} 个文件", "Generated {count} image": "已生成 {count} 张图片", "Video complete": "视频已生成完成", "Saved {value}": "已保存 {value}",
};

function interpolate(template: string, values?: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? `{${key}}`));
}

export function resolveLocale(value: string | null | undefined): Locale {
  return value === "zh-CN" ? "zh-CN" : "en";
}

export function translate(locale: Locale, key: string, values?: Record<string, string | number>) {
  return interpolate(locale === "zh-CN" ? zh[key] ?? key : key, values);
}

type I18nState = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: string, values?: Record<string, string | number>) => string };
const I18nContext = createContext<I18nState>({ locale: "en", setLocale: () => undefined, t: (key) => key });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveLocale(localStorage.getItem(LOCALE_STORAGE_KEY)));
  useEffect(() => { localStorage.setItem(LOCALE_STORAGE_KEY, locale); document.documentElement.lang = locale; }, [locale]);
  const value = useMemo(() => ({ locale, setLocale: setLocaleState, t: (key: string, values?: Record<string, string | number>) => translate(locale, key, values) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() { return useContext(I18nContext); }
