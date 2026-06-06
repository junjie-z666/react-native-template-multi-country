# @azsxdc12356/react-native-template-multi-country

React Native 模板脚手架，用于构建多国家独立部署的 Android App。

通过 Android product flavors + 独立 JS 入口，每个国家拥有独立的 applicationId、App 名称、图标和 JS bundle，起到防关联的效果。

[架构说明](https://juejin.cn/post/7645209991487946758)

## 核心特性

- **防关联** — 每个国家的 applicationId以及内部的类可以完全无关
- **构建时区分** — Gradle 单数据源驱动 product flavors 和 JS bundle 入口
- **import 边界防护** — ESLint 自定义规则 + pre-commit hook
- **一键添加/移除国家** — 脚手架脚本自动生成完整骨架
## 安装

```bash
npx react-native init MyApp --template @azsxdc12356/react-native-template-multi-country
```

## 快速开始

```bash
cd MyApp
yarn install
yarn init-country    # 交互式初始化：设置 Android 包名 + 添加首个国家
yarn start
npx react-native run-android --variant <country>Debug
```

## 添加国家

```bash
yarn add-country
```

或手动：

```bash
node scripts/add-country.js <country-code> <application-id> <activity-class-name> [app-name] [api-base-url] [default-locale] [--package com.xxx.xxx]
```

## License

MIT
