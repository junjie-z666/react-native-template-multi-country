import React from "react";
import { BaseApp, type CountryConfig } from "../base";
import { initI18n } from "../base/locales/i18n";

const cnConfig: CountryConfig = {
  apiBaseUrl: "https://api.cn.example.com",
  appName: "中国App",
  appIcon: "ic_launcher_cn",
  defaultLocale: "zh-CN",
};

// TODO: Add country-specific translations
initI18n({}, cnConfig.defaultLocale);

export function App(): React.JSX.Element {
  return <BaseApp config={cnConfig} />;
}
