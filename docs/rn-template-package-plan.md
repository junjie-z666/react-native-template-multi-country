# RN 模板包方案

将项目发布为 React Native 自定义模板包，用户可通过以下命令初始化项目：

```bash
npx @react-native-community/cli init MyApp --template multi-country
```

## 包规范

### 命名

- npm 包名：`react-native-template-multi-country`
- 用户使用时 CLI 自动拼接前缀，只需写 `--template multi-country`

### 目录结构

```
react-native-template-multi-country/
├── package.json              # 根 package.json（模板包元信息）
├── template.config.js        # 模板配置（占位符声明）
├── README.md
├── LICENSE
└── template/                 # 完整项目文件
    ├── package.json          # name 为 "HelloWorld" 占位符
    ├── app.json              # name/displayName 为 "HelloWorld"
    ├── babel.config.js
    ├── metro.config.js
    ├── tsconfig.json
    ├── jest.config.js
    ├── eslint.config.js
    ├── index.cn.js
    ├── index.mx.js
    ├── scripts/
    ├── src/
    ├── android/
    ├── ios/
    ├── eslint-plugin-import-boundary/
    ├── .husky/
    └── ...
```

### template.config.js

```javascript
module.exports = {
  placeholderName: "HelloWorld",
  templateDir: "./template",
};
```

CLI 初始化时会将 `template/` 目录中所有出现 `HelloWorld` 的地方替换为用户输入的项目名。

### 根 package.json

```json
{
  "name": "react-native-template-multi-country",
  "version": "0.1.0",
  "description": "React Native template for multi-country deployment with anti-association architecture",
  "files": ["template", "template.config.js"],
  "keywords": [
    "react-native",
    "template",
    "multi-country",
    "flavor",
    "anti-association"
  ],
  "license": "MIT"
}
```

## 需要修改的占位符

CLI 的占位符替换机制：将所有 `HelloWorld` 替换为用户输入的项目名。需要把项目名相关的地方统一改为 `HelloWorld`。

### JS 层

| 文件                    | 修改内容                                 |
| ----------------------- | ---------------------------------------- |
| `template/package.json` | `name` → `"HelloWorld"`                  |
| `template/app.json`     | `name` 和 `displayName` → `"HelloWorld"` |

JS 源码（`src/`）不含项目名，不需要修改。

### Android 层

| 文件                                               | 修改内容                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `build.gradle`                                     | `namespace` → `"com.helloworld"`，`defaultConfig.applicationId` → `"com.helloworld"` |
| `src/main/java/`                                   | 包路径 `com/multicountrydemo/` → `com/helloworld/`                                   |
| `src/main/java/com/helloworld/MainApplication.kt`  | `package com.helloworld`                                                             |
| `src/main/java/com/helloworld/BaseActivity.kt`     | `package com.helloworld`                                                             |
| `src/cn/java/com/helloworld/ZhongguoActivity.kt`   | `package com.helloworld`                                                             |
| `src/mx/java/com/helloworld/MexicoMainActivity.kt` | `package com.helloworld`                                                             |
| `src/cn/AndroidManifest.xml`                       | `android:name` 引用保持相对路径 `.{ActivityName}`                                    |
| `src/mx/AndroidManifest.xml`                       | 同上                                                                                 |

注意：`ext.countryFlavors` 中每个国家的 `applicationId` 是独立声明的（如 `com.zhongguo.app`），不需要占位符替换。

### 不需要修改的

- `src/` 下的 JS/TS 代码 — 不含项目名
- `scripts/add-country.js` — 用参数生成，不硬编码项目名
- `scripts/remove-country.js` — 不涉及项目名
- `ext.countryFlavors` 中的 applicationId — 每个国家独立声明
- ESLint 插件 — 不含项目名
- Metro/Babel/tsconfig 配置 — 不含项目名

## 实施步骤

1. 创建根目录 `react-native-template-multi-country/`
2. 编写 `template.config.js`
3. 编写根 `package.json`（files 只包含 `template` 和 `template.config.js`）
4. 将现有项目文件复制到 `template/` 子目录
5. 修改 `template/` 中的占位符（上表所列）
6. 调整 Android 包路径（`com/multicountrydemo/` → `com/helloworld/`）
7. 本地测试：`npx @react-native-community/cli init TestApp --template file:./react-native-template-multi-country`
8. `npm publish`

## 用户使用流程

```bash
# 初始化项目
npx @react-native-community/cli init MyApp --template multi-country

cd MyApp

# 安装依赖
yarn install

# 运行指定国家
npx react-native run-android --variant cnDebug
npx react-native run-android --variant mxDebug

# 添加新国家
node scripts/add-country.js br com.brasil.meuapp BrasilActivity

# 删除国家
node scripts/remove-country.js mx
```

## 注意事项

- CLI 只做简单的文本替换（`HelloWorld` → 项目名），不处理大小写变体。Android 包路径统一用小写 `com/helloworld/`，与 `placeholderName` 的大小写无关。
- 如果项目名包含特殊字符，CLI 会自动清理。Android 包路径需要确保合法。
- `ext.countryFlavors` 中的国家 applicationId 不参与占位符替换，用户需要在 `add-country.js` 时传入正确的 applicationId。
- iOS 目前不在模板范围内，`template/ios/` 保留 RN 默认模板内容即可。
