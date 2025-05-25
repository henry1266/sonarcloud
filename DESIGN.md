# SonarCloud 品質資料下載器設計文件

## 概述

SonarCloud 品質資料下載器是一個 Node.js 應用程式，旨在從 SonarCloud API 獲取專案品質資料，並以結構化格式儲存或輸出。此工具可協助開發團隊監控程式碼品質指標，追蹤專案改進情況，並支援自動化品質報告生成。

## 功能需求

下載器將提供以下核心功能：

1. 從 SonarCloud API 獲取專案品質資料，包括但不限於：程式碼覆蓋率、重複程式碼比例、技術債務、問題數量（按嚴重性分類）、安全漏洞等。

2. 支援多種輸出格式，包括 JSON、CSV 和格式化文本報告，以滿足不同使用場景需求。

3. 提供命令列介面，允許使用者指定專案金鑰、時間範圍和其他過濾條件。

4. 支援定期自動執行，以便整合至 CI/CD 流程或排程任務。

5. 提供資料比較功能，可對比不同時間點的品質指標，突顯改進或退步的領域。

## 技術架構

### 依賴套件

- **axios**: 用於發送 HTTP 請求至 SonarCloud API
- **dotenv**: 用於管理環境變數，特別是敏感資訊如 API 令牌
- **commander**: 用於建立命令列介面
- **chalk**: 用於美化命令列輸出
- **fs-extra**: 用於檔案系統操作
- **json2csv**: 用於將 JSON 資料轉換為 CSV 格式

### 檔案結構

```
sonarcloud/
├── .env                  # 環境變數檔案（不納入版本控制）
├── .env.example          # 環境變數範例檔案
├── .gitignore            # Git 忽略檔案列表
├── index.js              # 應用程式入口點
├── package.json          # 專案配置檔案
├── README.md             # 專案說明文件
├── src/
│   ├── api/              # API 相關模組
│   │   └── sonarcloud.js # SonarCloud API 介接模組
│   ├── commands/         # 命令列指令模組
│   │   ├── fetch.js      # 獲取資料指令
│   │   ├── compare.js    # 比較資料指令
│   │   └── report.js     # 生成報告指令
│   ├── utils/            # 工具函數
│   │   ├── formatter.js  # 資料格式化工具
│   │   └── storage.js    # 資料儲存工具
│   └── config.js         # 配置檔案載入模組
└── test/                 # 測試檔案
    └── api.test.js       # API 測試
```

## 環境變數設定

為確保安全性，敏感資訊如 API 令牌將存放於 `.env` 檔案中，並透過 `.gitignore` 排除於版本控制。環境變數包括：

```
# SonarCloud API 設定
SONAR_TOKEN=your_sonar_token_here
SONAR_ORGANIZATION=organization_name
SONAR_HOST_URL=https://sonarcloud.io

# 預設專案設定
DEFAULT_PROJECT_KEY=default_project_key

# 輸出設定
OUTPUT_DIR=./output
DEFAULT_FORMAT=json
```

專案將提供 `.env.example` 作為範例，使用者需複製此檔案並重新命名為 `.env`，填入自己的設定值。

## API 介接設計

下載器將使用 SonarCloud REST API 獲取資料，主要使用以下端點：

1. **專案資訊**: `/api/projects/search`
2. **品質閘道狀態**: `/api/qualitygates/project_status`
3. **度量資料**: `/api/measures/component`
4. **問題清單**: `/api/issues/search`
5. **程式碼覆蓋率**: `/api/measures/component_tree`

API 請求將包含必要的認證資訊（令牌）和查詢參數，以獲取特定專案的資料。

## 命令列介面

下載器將提供以下命令：

1. **fetch**: 獲取並儲存品質資料
   ```
   node index.js fetch --project=my_project --format=json
   ```

2. **compare**: 比較不同時間點的品質資料
   ```
   node index.js compare --project=my_project --from=2025-05-01 --to=2025-05-25
   ```

3. **report**: 生成品質報告
   ```
   node index.js report --project=my_project --template=summary
   ```

每個命令都支援多種選項，以自訂輸出格式、過濾條件和其他行為。

## 資料處理流程

1. **資料獲取**: 從 SonarCloud API 獲取原始資料
2. **資料轉換**: 將原始資料轉換為標準化格式
3. **資料儲存**: 將標準化資料儲存至檔案系統
4. **資料分析**: 分析資料以產生統計和趨勢
5. **資料呈現**: 根據使用者選擇的格式輸出資料

## 錯誤處理

下載器將實作全面的錯誤處理機制，包括：

1. API 連線錯誤處理
2. 認證失敗處理
3. 資料格式錯誤處理
4. 檔案系統操作錯誤處理

所有錯誤將提供清晰的錯誤訊息，並在適當情況下提供解決建議。

## 擴展性考量

設計將考慮未來可能的擴展需求：

1. 支援多個 SonarCloud 專案的批次處理
2. 整合其他程式碼品質工具的資料
3. 提供 Web 介面以視覺化呈現資料
4. 支援自訂資料處理插件

## 安全性考量

1. API 令牌將只存放於本地 `.env` 檔案，不納入版本控制
2. 所有 HTTP 請求將使用 HTTPS
3. 敏感資料不會記錄在日誌檔案中
4. 使用者輸入將經過驗證，以防止注入攻擊

## 後續步驟

完成設計後，開發將按以下順序進行：

1. 實作核心 API 介接模組
2. 實作命令列介面
3. 實作資料處理和儲存功能
4. 實作報告生成功能
5. 撰寫測試和文件
6. 進行整合測試和效能優化
