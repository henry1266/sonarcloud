/**
 * 比較資料指令模組
 * 負責比較不同時間點的品質資料
 */

const storage = require('../utils/storage');
const formatter = require('../utils/formatter');
const { config } = require('../config');

/**
 * 比較不同時間點的品質資料
 * @param {Object} options - 指令選項
 * @returns {Promise<Object>} - 操作結果
 */
async function compareData(options) {
  const {
    project = config.sonar.defaultProjectKey,
    from,
    to,
    format = config.output.defaultFormat,
    output = null
  } = options;

  console.log(`正在比較專案 ${project} 的品質資料...`);
  
  try {
    // 檢查必要參數
    if (!from || !to) {
      throw new Error('必須提供 from 和 to 參數以指定比較的資料檔案');
    }
    
    // 讀取資料檔案
    console.log(`讀取資料檔案: ${from} 和 ${to}`);
    const fromData = storage.loadData(from);
    const toData = storage.loadData(to);
    
    // 比較資料
    const comparison = compareQualityData(fromData, toData);
    
    // 決定輸出檔名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = output || `${project}_quality_comparison_${timestamp}`;
    
    // 儲存比較結果
    const filepath = formatter.saveToFile(comparison, filename, format);
    
    console.log(`比較結果已儲存至: ${filepath}`);
    
    return {
      success: true,
      message: `比較結果已儲存至: ${filepath}`,
      comparison,
      filepath
    };
  } catch (error) {
    console.error(`比較資料失敗: ${error.message}`);
    return {
      success: false,
      message: `比較資料失敗: ${error.message}`
    };
  }
}

/**
 * 比較兩個品質資料物件
 * @param {Object} fromData - 起始資料
 * @param {Object} toData - 結束資料
 * @returns {Object} - 比較結果
 */
function compareQualityData(fromData, toData) {
  // 初始化比較結果
  const result = {
    project: toData.projectInfo?.name || 'Unknown',
    fromDate: fromData.timestamp || 'Unknown',
    toDate: toData.timestamp || 'Unknown',
    qualityGateChange: compareQualityGate(fromData.qualityGate, toData.qualityGate),
    measuresChange: compareMeasures(fromData.measures, toData.measures),
    issuesChange: compareIssues(fromData.issues, toData.issues),
    summary: {}
  };
  
  // 生成摘要
  result.summary = generateSummary(result);
  
  return result;
}

/**
 * 比較品質閘道狀態
 * @param {Object} from - 起始品質閘道狀態
 * @param {Object} to - 結束品質閘道狀態
 * @returns {Object} - 比較結果
 */
function compareQualityGate(from, to) {
  if (!from || !to) {
    return { available: false };
  }
  
  return {
    available: true,
    fromStatus: from.status,
    toStatus: to.status,
    improved: from.status !== 'OK' && to.status === 'OK',
    degraded: from.status === 'OK' && to.status !== 'OK'
  };
}

/**
 * 比較度量資料
 * @param {Array} from - 起始度量資料
 * @param {Array} to - 結束度量資料
 * @returns {Object} - 比較結果
 */
function compareMeasures(from, to) {
  if (!Array.isArray(from) || !Array.isArray(to)) {
    return { available: false };
  }
  
  // 將度量資料轉換為物件，以便於比較
  const fromObj = from.reduce((obj, measure) => {
    obj[measure.metric] = measure.value;
    return obj;
  }, {});
  
  const toObj = to.reduce((obj, measure) => {
    obj[measure.metric] = measure.value;
    return obj;
  }, {});
  
  // 合併所有度量鍵
  const allMetrics = [...new Set([...Object.keys(fromObj), ...Object.keys(toObj)])];
  
  // 比較每個度量
  const changes = {};
  allMetrics.forEach(metric => {
    const fromValue = parseFloat(fromObj[metric]) || 0;
    const toValue = parseFloat(toObj[metric]) || 0;
    const diff = toValue - fromValue;
    
    // 判斷變化是否為改進
    let improved = false;
    if (metric === 'coverage') {
      improved = diff > 0;
    } else if (['bugs', 'vulnerabilities', 'code_smells', 'duplicated_lines_density'].includes(metric)) {
      improved = diff < 0;
    }
    
    changes[metric] = {
      from: fromObj[metric] || '0',
      to: toObj[metric] || '0',
      diff,
      improved
    };
  });
  
  return {
    available: true,
    changes
  };
}

/**
 * 比較問題資料
 * @param {Array} from - 起始問題資料
 * @param {Array} to - 結束問題資料
 * @returns {Object} - 比較結果
 */
function compareIssues(from, to) {
  if (!Array.isArray(from) || !Array.isArray(to)) {
    return { available: false };
  }
  
  // 計算各嚴重性問題數量
  const severities = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
  
  const fromCounts = severities.reduce((counts, severity) => {
    counts[severity] = from.filter(issue => issue.severity === severity).length;
    return counts;
  }, {});
  
  const toCounts = severities.reduce((counts, severity) => {
    counts[severity] = to.filter(issue => issue.severity === severity).length;
    return counts;
  }, {});
  
  // 比較各嚴重性問題數量
  const changes = {};
  severities.forEach(severity => {
    const fromCount = fromCounts[severity] || 0;
    const toCount = toCounts[severity] || 0;
    const diff = toCount - fromCount;
    
    changes[severity] = {
      from: fromCount,
      to: toCount,
      diff,
      improved: diff < 0
    };
  });
  
  // 計算總問題數變化
  const totalFrom = Object.values(fromCounts).reduce((sum, count) => sum + count, 0);
  const totalTo = Object.values(toCounts).reduce((sum, count) => sum + count, 0);
  const totalDiff = totalTo - totalFrom;
  
  return {
    available: true,
    changes,
    total: {
      from: totalFrom,
      to: totalTo,
      diff: totalDiff,
      improved: totalDiff < 0
    }
  };
}

/**
 * 生成比較摘要
 * @param {Object} comparison - 比較結果
 * @returns {Object} - 摘要
 */
function generateSummary(comparison) {
  const summary = {
    qualityGate: 'No change',
    improvements: [],
    degradations: []
  };
  
  // 品質閘道摘要
  if (comparison.qualityGateChange.available) {
    if (comparison.qualityGateChange.improved) {
      summary.qualityGate = 'Improved (Failed -> Passed)';
    } else if (comparison.qualityGateChange.degraded) {
      summary.qualityGate = 'Degraded (Passed -> Failed)';
    }
  }
  
  // 度量變化摘要
  if (comparison.measuresChange.available) {
    const changes = comparison.measuresChange.changes;
    
    // 檢查每個度量的變化
    Object.entries(changes).forEach(([metric, change]) => {
      if (change.improved && Math.abs(change.diff) > 0) {
        summary.improvements.push(`${metric}: ${change.from} -> ${change.to}`);
      } else if (!change.improved && Math.abs(change.diff) > 0) {
        summary.degradations.push(`${metric}: ${change.from} -> ${change.to}`);
      }
    });
  }
  
  // 問題變化摘要
  if (comparison.issuesChange.available && comparison.issuesChange.total.diff !== 0) {
    const totalChange = comparison.issuesChange.total;
    if (totalChange.improved) {
      summary.improvements.push(`Total issues: ${totalChange.from} -> ${totalChange.to} (${Math.abs(totalChange.diff)} fixed)`);
    } else {
      summary.degradations.push(`Total issues: ${totalChange.from} -> ${totalChange.to} (${Math.abs(totalChange.diff)} new)`);
    }
  }
  
  return summary;
}

module.exports = compareData;
