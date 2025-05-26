/**
 * 抓取 SonarCloud 上所有狀態的項目並按照 component 名稱排序
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

async function fetchAllIssues() {
  try {
    console.log('正在初始化 SonarCloud API 客戶端...');
    const api = new SonarCloudAPI();
    
    // 從環境變數取得專案金鑰
    const projectKey = process.env.DEFAULT_PROJECT_KEY;
    console.log(`目標專案: ${projectKey}`);
    
    console.log('正在抓取所有狀態的項目...');
    // 不指定 statuses 參數，取得所有狀態的問題
    const issues = await api.getIssues(projectKey);
    
    console.log(`成功抓取 ${issues.length} 個項目`);
    
    if (issues.length === 0) {
      console.log('警告: 未找到任何項目');
      return { success: false, message: '未找到任何項目' };
    }
    
    // 檢查是否有 component 欄位
    if (issues[0].component) {
      console.log('項目資料包含 component 欄位，準備進行排序...');
      
      // 按照 component 名稱排序
      const sortedIssues = issues.sort((a, b) => {
        return a.component.localeCompare(b.component);
      });
      
      // 將排序後的資料寫入檔案
      const outputPath = path.join(outputDir, 'all_issues_sorted_by_component.json');
      fs.writeFileSync(outputPath, JSON.stringify(sortedIssues, null, 2));
      
      console.log(`排序完成，結果已儲存至: ${outputPath}`);
      
      // 建立一個簡易的統計報告
      const componentCounts = {};
      sortedIssues.forEach(issue => {
        if (!componentCounts[issue.component]) {
          componentCounts[issue.component] = 0;
        }
        componentCounts[issue.component]++;
      });
      
      const statsPath = path.join(outputDir, 'component_statistics.json');
      fs.writeFileSync(statsPath, JSON.stringify(componentCounts, null, 2));
      
      console.log(`組件統計報告已儲存至: ${statsPath}`);
      
      return { 
        success: true, 
        data: sortedIssues, 
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
fetchAllIssues()
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
