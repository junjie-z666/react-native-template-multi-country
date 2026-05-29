import React from "react";
import { BaseApp, type CountryConfig } from "../base";
import { initI18n } from "../base/locales/i18n";
import { mxTranslations } from "./locales/es";

const mxConfig: CountryConfig = {
  apiBaseUrl: "https://api.mx.example.com",
  appName: "MexicoApp",
  appIcon: "ic_launcher_mx",
  defaultLocale: "es-MX",
};

initI18n({ "es-MX": mxTranslations }, mxConfig.defaultLocale);

export function App(): React.JSX.Element {
  return <BaseApp config={mxConfig} />;
}
