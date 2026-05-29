# HelloWorld

一个 React Native 仓库，产出完全无关的多个 Android App。

通过 Android product flavors + 独立 JS 入口，实现构建时区分——每个国家拥有独立的 applicationId、App 名称、图标和 JS bundle，在应用商店中无法被关联。

**核心特色：**

- **防关联** — 每个国家的 applicationId 完全无关，无共享前缀，无 `applicationIdSuffix`
- **构建时区分** — Gradle 单数据源驱动 product flavors 和 JS bundle 入口，非运行时切换
- **组合而非继承** — 国家通过注入 `CountryConfig` 定制 Base 层，不修改共享代码
- **import 边界防护** — ESLint 自定义规则 + pre-commit hook，阻止跨国家引用和 Base 反向依赖
- **一键添加国家** — `add-country.js` 脚本自动生成完整骨架

<!-- 截图占位：替换为实际截图 -->

|                 中国 App                 |                墨西哥 App                |
| :--------------------------------------: | :--------------------------------------: |
| ![cn-demo](docs/screenshots/cn-demo.png) | ![mx-demo](docs/screenshots/mx-demo.png) |

## 快速开始

```bash
# 克隆项目
git clone <repo-url>
cd test_multi_rn

# 安装依赖
yarn install

# 启动 Metro
yarn start

# 新终端：运行指定国家的 App
npx react-native run-android --variant cnDebug
npx react-native run-android --variant mxDebug
```

构建 Release 包：

```bash
cd android
./gradlew assembleCnRelease
./gradlew assembleMxRelease
```

## 添加新国家

```bash
node scripts/add-country.js <country-code> <application-id> <activity-class-name> [app-name] [api-base-url] [default-locale]
```

示例：

```bash
node scripts/add-country.js br com.brasil.meuapp BrasilActivity BrasilApp https://api.br.example.com pt-BR
```

脚本会自动完成以下步骤：

1. 创建 JS 入口文件 `index.<code>.js`
2. 创建 JS 国家目录 `src/<code>/App.tsx` + `locales/` 占位文件
3. 创建 Android source set（Activity 类 + AndroidManifest.xml）
4. 创建 Android 资源（`strings.xml` + 5 个密度的 mipmap 占位图标）
5. 更新 `build.gradle` 的 `ext.countryFlavors`
6. 更新 ESLint 插件的 `countryDirs` 列表

校验规则：国家代码必须为 2 位小写字母，不允许与已有国家重复。

## 项目结构

```
├── index.cn.js              # 中国 JS 入口
├── index.mx.js              # 墨西哥 JS 入口
├── src/
│   ├── base/                # 共享层：BaseApp 组件、CountryConfig 类型、initI18n
│   │   ├── components/      # BaseApp.tsx
│   │   ├── types/           # CountryConfig.ts
│   │   └── locales/         # 基础翻译 + initI18n
│   ├── cn/                  # 中国：App 组件 + 中文翻译
│   └── mx/                  # 墨西哥：App 组件 + 西班牙语翻译
├── android/
│   └── app/src/
│       ├── main/            # 共享 Android 代码（MainApplication、BaseActivity）
│       ├── cn/              # 中国 source set（Activity、图标、strings.xml）
│       └── mx/              # 墨西哥 source set（Activity、图标、strings.xml）
├── scripts/
│   └── add-country.js       # 一键添加国家脚手架
├── eslint-plugin-import-boundary/  # 自定义 ESLint import 边界规则
└── docs/                    # 架构文档、ADR
```
