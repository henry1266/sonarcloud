/**
 * 過濾 SonarCloud 議題資料，只保留 OPEN 狀態的項目
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// 讀取議題資料
const inputFile = path.join(__dirname, '../output/issues_full.json');
const outputFile = path.join(__dirname, '../output/open_issues.json');

try {
  console.log(chalk.blue('開始讀取 SonarCloud 議題資料...'));
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  if (!data.issues || !Array.isArray(data.issues)) {
    console.error(chalk.red('錯誤: 找不到有效的議題資料'));
    process.exit(1);
  }
  
  console.log(chalk.blue(`找到 ${data.issues.length} 筆議題資料`));
  
  // 過濾 OPEN 狀態的議題
  const openIssues = data.issues.filter(issue => issue.status === 'OPEN');
  console.log(chalk.green(`過濾出 ${openIssues.length} 筆 OPEN 狀態的議題`));
  
  // 儲存過濾後的資料
  fs.writeFileSync(outputFile, JSON.stringify(openIssues, null, 2));
  console.log(chalk.green(`OPEN 狀態議題已儲存至: ${outputFile}`));
  
  // 打印資料
  console.log(chalk.yellow('\n===== OPEN 狀態議題清單 ====='));
  openIssues.forEach((issue, index) => {
    console.log(chalk.cyan(`[${index + 1}] ${issue.component}`));
    console.log(`    Key: ${issue.key}`);
    console.log(`    Type: ${issue.type}`);
    console.log(`    Severity: ${issue.severity}`);
    console.log(`    Message: ${issue.message}`);
    console.log('');
  });
  
  console.log(chalk.green(`總計: ${openIssues.length} 筆 OPEN 狀態議題`));
  
} catch (error) {
  console.error(chalk.red(`處理議題資料時發生錯誤: ${error.message}`));
  process.exit(1);
}
