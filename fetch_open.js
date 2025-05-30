/**
 * 抓取 SonarCloud 上所有 OPEN 狀態的項目並按照 component 名稱排序，只保留精簡欄位
 */

require('dotenv').config();
const SonarCloudAPI = require('./src/api/sonarcloud');
const fs = require('fs');
const path = require('path');

// 確保輸出目錄存在
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function fetchOpenIssues() {
  try {
    console.log('正在初始化 SonarCloud API 客戶端...');
    const api = new SonarCloudAPI();

    // 從環境變數取得專案金鑰
    const projectKey = process.env.DEFAULT_PROJECT_KEY;
    console.log(`目標專案: ${projectKey}`);

    console.log('正在抓取 OPEN 狀態的項目...');
    // 指定 statuses 參數為 OPEN，只取得 open 狀態的問題
    const issues = await api.getIssues(projectKey, { statuses: 'OPEN' });

    console.log(`成功抓取 ${issues.length} 個 OPEN 項目`);

    if (issues.length === 0) {
      console.log('警告: 未找到任何 OPEN 狀態的項目');
      return { success: false, message: '未找到任何 OPEN 狀態的項目' };
    }

    // 檢查是否有 component 欄位
    if (issues[0].component) {
      console.log('項目資料包含 component 欄位，準備進行排序...');

      // 按照 component 名稱排序
      const sortedIssues = issues.sort((a, b) => {
        return a.component.localeCompare(b.component);
      });

      // === ↓↓↓↓↓ 只保留精簡欄位 ↓↓↓↓↓ ===
      const simplifiedIssues = sortedIssues.map(issue => ({
        component: issue.component,
        line: issue.line,
        message: issue.message,
        severity: issue.severity,
        type: issue.type,
        rule: issue.rule,
        // 如有需要，可加入其他欄位
      }));

      // 將精簡欄位寫入檔案
      const outputPath = path.join(outputDir, 'open_issues_simplified.json');
      fs.writeFileSync(outputPath, JSON.stringify(simplifiedIssues, null, 2));
      console.log(`簡化欄位輸出已儲存至: ${outputPath}`);

      // 建立簡易統計報告（如有需要）
      const componentCounts = {};
      simplifiedIssues.forEach(issue => {
        if (!componentCounts[issue.component]) {
          componentCounts[issue.component] = 0;
        }
        componentCounts[issue.component]++;
      });

      const statsPath = path.join(outputDir, 'open_component_statistics.json');
      fs.writeFileSync(statsPath, JSON.stringify(componentCounts, null, 2));
      console.log(`OPEN 項目組件統計報告已儲存至: ${statsPath}`);

      return {
        success: true,
        data: simplifiedIssues,
        path: outputPath,
        statsPath: statsPath,
        componentCounts: componentCounts
      };
    } else {
      console.log('警告: 項目資料不包含 component 欄位，無法進行排序');
      return { success: false, message: '項目資料不包含 component 欄位' };
    }
  } catch (error) {
    console.error(`執行錯誤: ${error.message}`);
    return { success: false, message: error.message };
  }
}

// 執行主程式
fetchOpenIssues()
  .then(result => {
    if (result.success) {
      console.log('任務完成');
    } else {
      console.error(`任務失敗: ${result.message}`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`未預期的錯誤: ${error.message}`);
    process.exit(1);
  });
