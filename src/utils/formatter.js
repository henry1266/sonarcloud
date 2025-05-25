/**
 * 資料格式化工具
 * 負責將 API 回傳的資料轉換為不同格式
 */

const fs = require('fs');
const path = require('path');
const { config } = require('../config');

class Formatter {
  /**
   * 將資料轉換為 JSON 格式
   * @param {Object} data - 要轉換的資料
   * @returns {string} - JSON 字串
   */
  toJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  /**
   * 將資料轉換為 CSV 格式
   * @param {Array} data - 要轉換的資料陣列
   * @param {Array} headers - CSV 標頭
   * @returns {string} - CSV 字串
   */
  toCSV(data, headers) {
    if (!Array.isArray(data)) {
      throw new Error('CSV 格式化需要陣列資料');
    }

    // 建立標頭行
    let csv = headers.join(',') + '\n';

    // 建立資料行
    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header] || '';
        // 處理包含逗號的值
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      });
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  /**
   * 將度量資料轉換為人類可讀的文本報告
   * @param {Object} data - 品質報告資料
   * @returns {string} - 文本報告
   */
  toTextReport(data) {
    const { projectInfo, qualityGate, measures } = data;
    
    if (!projectInfo || !qualityGate || !measures) {
      throw new Error('無效的報告資料');
    }

    // 建立報告標題
    let report = `# SonarCloud 品質報告: ${projectInfo.name}\n\n`;
    report += `生成時間: ${new Date().toLocaleString()}\n\n`;
    
    // 品質閘道狀態
    report += `## 品質閘道狀態\n\n`;
    report += `狀態: ${qualityGate.status === 'OK' ? '通過 ✅' : '未通過 ❌'}\n\n`;
    
    // 度量資料
    report += `## 主要品質指標\n\n`;
    
    // 將度量資料轉換為可讀格式
    const metricLabels = {
      'ncloc': '程式碼行數',
      'coverage': '測試覆蓋率',
      'duplicated_lines_density': '重複程式碼比例',
      'bugs': 'Bug 數量',
      'vulnerabilities': '安全漏洞數量',
      'code_smells': '程式碼異味數量',
      'security_hotspots': '安全熱點數量'
    };
    
    measures.forEach(measure => {
      const label = metricLabels[measure.metric] || measure.metric;
      let value = measure.value;
      
      // 格式化百分比
      if (measure.metric === 'coverage' || measure.metric === 'duplicated_lines_density') {
        value = `${value}%`;
      }
      
      report += `- ${label}: ${value}\n`;
    });
    
    // 如果有問題資料，加入問題摘要
    if (data.issues && data.issues.length > 0) {
      report += `\n## 問題摘要\n\n`;
      
      // 按嚴重性分類問題
      const severityGroups = data.issues.reduce((groups, issue) => {
        const severity = issue.severity || 'UNKNOWN';
        if (!groups[severity]) {
          groups[severity] = [];
        }
        groups[severity].push(issue);
        return groups;
      }, {});
      
      // 嚴重性順序
      const severityOrder = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
      
      // 輸出各嚴重性的問題數量
      severityOrder.forEach(severity => {
        if (severityGroups[severity]) {
          report += `- ${severity}: ${severityGroups[severity].length} 個問題\n`;
        }
      });
    }
    
    return report;
  }

  /**
   * 儲存資料到檔案
   * @param {Object|Array} data - 要儲存的資料
   * @param {string} filename - 檔案名稱
   * @param {string} format - 輸出格式 (json, csv, text)
   * @param {Array} headers - CSV 格式的標頭 (僅在 format 為 'csv' 時使用)
   * @returns {string} - 儲存的檔案路徑
   */
  saveToFile(data, filename, format = config.output.defaultFormat, headers = []) {
    // 確保輸出目錄存在
    const outputDir = config.output.dir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 決定檔案副檔名
    const extensions = {
      'json': '.json',
      'csv': '.csv',
      'text': '.txt'
    };
    
    const ext = extensions[format] || '.json';
    const filepath = path.join(outputDir, `${filename}${ext}`);
    
    // 轉換資料為指定格式
    let content;
    switch (format) {
      case 'csv':
        content = this.toCSV(data, headers);
        break;
      case 'text':
        content = this.toTextReport(data);
        break;
      case 'json':
      default:
        content = this.toJSON(data);
    }
    
    // 寫入檔案
    fs.writeFileSync(filepath, content, 'utf8');
    
    return filepath;
  }
}

module.exports = new Formatter();
