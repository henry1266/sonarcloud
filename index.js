#!/usr/bin/env node

/**
 * SonarCloud 品質資料下載器
 * 主程式入口點
 */

const { program } = require('commander');
const chalk = require('chalk');
const { config, validateConfig } = require('./src/config');
const fetchData = require('./src/commands/fetch');
const compareData = require('./src/commands/compare');
const generateReport = require('./src/commands/report');

// 設定版本與描述
program
  .name('sonarcloud-downloader')
  .description('SonarCloud 品質資料下載器 - 獲取、比較與報告 SonarCloud 專案品質資料')
  .version('1.0.0');

// 獲取資料指令
program
  .command('fetch')
  .description('從 SonarCloud 獲取品質資料')
  .option('-p, --project <key>', '專案金鑰', config.sonar.defaultProjectKey)
  .option('-f, --format <format>', '輸出格式 (json, csv, text)', config.output.defaultFormat)
  .option('-o, --output <filename>', '輸出檔名 (不含副檔名)')
  .option('-m, --metrics <metrics>', '指定度量指標 (逗號分隔)')
  .action(async (options) => {
    try {
      validateConfig();
      const result = await fetchData(options);
      if (result.success) {
        console.log(chalk.green(result.message));
      } else {
        console.error(chalk.red(result.message));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`執行錯誤: ${error.message}`));
      process.exit(1);
    }
  });

// 比較資料指令
program
  .command('compare')
  .description('比較不同時間點的品質資料')
  .option('-p, --project <key>', '專案金鑰', config.sonar.defaultProjectKey)
  .option('--from <filename>', '起始資料檔名 (必須)')
  .option('--to <filename>', '結束資料檔名 (必須)')
  .option('-f, --format <format>', '輸出格式 (json, text)', config.output.defaultFormat)
  .option('-o, --output <filename>', '輸出檔名 (不含副檔名)')
  .action(async (options) => {
    try {
      validateConfig();
      const result = await compareData(options);
      if (result.success) {
        console.log(chalk.green(result.message));
      } else {
        console.error(chalk.red(result.message));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`執行錯誤: ${error.message}`));
      process.exit(1);
    }
  });

// 生成報告指令
program
  .command('report')
  .description('生成品質報告')
  .option('-p, --project <key>', '專案金鑰', config.sonar.defaultProjectKey)
  .option('-t, --template <template>', '報告模板 (summary, detailed, issues)', 'summary')
  .option('-f, --format <format>', '輸出格式 (json, text)', 'text')
  .option('-o, --output <filename>', '輸出檔名 (不含副檔名)')
  .action(async (options) => {
    try {
      validateConfig();
      const result = await generateReport(options);
      if (result.success) {
        console.log(chalk.green(result.message));
      } else {
        console.error(chalk.red(result.message));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`執行錯誤: ${error.message}`));
      process.exit(1);
    }
  });

// 顯示說明
if (process.argv.length <= 2) {
  program.help();
}

// 解析命令列參數
program.parse(process.argv);
