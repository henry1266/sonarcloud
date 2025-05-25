/**
 * 獲取資料指令模組
 * 負責從 SonarCloud API 獲取品質資料
 */

const SonarCloudAPI = require('../api/sonarcloud');
const formatter = require('../utils/formatter');
const storage = require('../utils/storage');
const { config } = require('../config');

/**
 * 獲取並儲存品質資料
 * @param {Object} options - 指令選項
 * @returns {Promise<Object>} - 操作結果
 */
async function fetchData(options) {
  const {
    project = config.sonar.defaultProjectKey,
    format = config.output.defaultFormat,
    output = null,
    metrics = null
  } = options;

  console.log(`正在獲取專案 ${project} 的品質資料...`);
  
  try {
    // 建立 API 客戶端
    const api = new SonarCloudAPI();
    
    // 獲取資料
    let data;
    if (metrics) {
      // 如果指定了特定度量，只獲取這些度量
      console.log(`獲取指定度量: ${metrics}`);
      data = await api.getProjectMeasures(project, metrics);
    } else {
      // 否則獲取完整品質報告
      console.log('獲取完整品質報告...');
      data = await api.getFullQualityReport(project);
    }
    
    // 決定輸出檔名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = output || `${project}_quality_report_${timestamp}`;
    
    // 儲存資料
    let filepath;
    if (format === 'csv' && Array.isArray(data)) {
      // 如果是 CSV 格式，需要提供標頭
      const headers = Object.keys(data[0] || {});
      filepath = formatter.saveToFile(data, filename, format, headers);
    } else {
      filepath = formatter.saveToFile(data, filename, format);
    }
    
    console.log(`品質資料已儲存至: ${filepath}`);
    
    return {
      success: true,
      message: `品質資料已儲存至: ${filepath}`,
      data,
      filepath
    };
  } catch (error) {
    console.error(`獲取資料失敗: ${error.message}`);
    return {
      success: false,
      message: `獲取資料失敗: ${error.message}`
    };
  }
}

module.exports = fetchData;
