# {{APP_NAME}}

一个 React Native 仓库，产出完全无关的多个 Android App。

通过 Android product flavors + 独立 JS 入口，每个国家拥有独立的 applicationId、App 名称、图标和 JS bundle，起到防关联的效果。

**核心特色：**

- **防关联** — 每个国家的 applicationId 完全无关，无共享前缀，无 `applicationIdSuffix`
- **构建时区分** — Gradle 单数据源驱动 product flavors 和 JS bundle 入口，非运行时切换
- **import 边界防护** — ESLint 自定义规则 + pre-commit hook，阻止跨国家引用和 Base 反向依赖
- **一键添加/删除国家** — `post-init.js` 脚本引导添加国家，`remove-country.js` 删除国家


## 项目结构

```
├── index.<country>.js         # 各国家 JS 入口（由 add-country 生成）
├── src/
│   ├── base/                  # 共享层：BaseApp 组件、CountryConfig 类型、initI18n
│   │   ├── components/        # BaseApp.tsx
│   │   ├── types/             # CountryConfig.ts
│   │   └── locales/           # 基础翻译 + initI18n
│   └── <country>/             # 各国家：App 组件 + 翻译（由 add-country 生成）
├── android/
│   └── app/src/
│       ├── main/              # 共享 Android 代码（BaseApplication、BaseMainActivity）
│       └── <country>/         # 各国家 source set（由 add-country 生成）
├── scripts/
│   ├── post-init.js           # 交互式初始化脚本（RN CLI postInitScript）
│   ├── add-country.js         # 一键添加国家脚手架
│   └── remove-country.js      # 移除国家脚本
├── eslint-plugin-import-boundary/  # 自定义 ESLint import 边界规则
│   ├── index.js               # 规则实现
│   └── country-dirs.json      # 国家目录列表（由 add/remove 脚本维护）
└── docs/                      # 架构文档、ADR
```

## 占位符说明

模板使用以下占位符，在 `post-init.js` 中替换：

| 占位符 | 含义 |
|--------|------|
| `{{APP_NAME}}` | 项目名（由 RN CLI 替换） |
| `{{ANDROID_PACKAGE}}` | Android 包名（由 post-init.js 替换） |


## 快速开始

### 1. 安装依赖

```bash
yarn install
```

### 2. 交互式初始化

```bash
yarn init-country
```

这一步会：
- 自动替换 `{{APP_NAME}}` 等占位符为实际项目名
- 引导你输入第一个国家的信息（applicationId、国家代码等）
- 自动生成该国家的完整骨架

### 3. 配置 Git Hooks（重要）

初始化完成后，必须手动配置 husky：

```bash
yarn setup-hooks
```

> 为什么需要手动？因为 husky 依赖 `.git` 目录，而 git 仓库是在 `react-native init` 完成后才初始化的，所以只能在最后一步手动执行。

### 4. 启动开发

```bash
# 启动 Metro
yarn start

# 新终端：运行指定国家的 App
npx react-native run-android --variant <country>Debug
```

### 5. 构建 Release 包

```bash
cd android
./gradlew assemble<Country>Release
```

## 添加新国家

```bash
yarn add-country
```

这会以交互式方式引导你输入新国家的信息，然后自动调用 `scripts/add-country.js` 生成完整骨架。

或手动执行（非交互式）：

```bash
node scripts/add-country.js <country-code> <application-id> <activity-class-name> [app-name] [api-base-url] [default-locale] [--package com.xxx.xxx]
```

示例：

```bash
node scripts/add-country.js br com.brasil.meuapp BrasilActivity "Brasil App" https://api.br.example.com pt-BR --package com.mycompany.myapp
```

`add-country.js` 会自动完成以下步骤：

1. 创建 JS 入口文件 `index.<code>.js`
2. 创建 JS 国家目录 `src/<code>/App.tsx` + `locales/` 占位文件
3. 创建 Android source set（Activity 类 + AndroidManifest.xml）
4. 创建 Android 资源（`strings.xml` + 5 个密度的 mipmap 占位图标）
5. 更新 `build.gradle` 的 `ext.countryFlavors`
6. 更新 ESLint 插件的 `country-dirs.json`


## 移除国家

```bash
yarn remove-country
```

或手动执行：

```bash
node scripts/remove-country.js <country-code>
```

