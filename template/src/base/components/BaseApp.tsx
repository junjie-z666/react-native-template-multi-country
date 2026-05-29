import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { CountryConfig } from "../types/CountryConfig";

interface BaseAppProps {
  config: CountryConfig;
  children?: React.ReactNode;
}

export function BaseApp({ config, children }: BaseAppProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{config.appName}</Text>
      <Text style={styles.subtitle}>{t("welcome")}</Text>
      <Text style={styles.subtitle}>API: {config.apiBaseUrl}</Text>
      <Text style={styles.subtitle}>Locale: {config.defaultLocale}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
});
