/**
 * 生成報告指令模組
 * 負責生成品質報告
 */

const SonarCloudAPI = require('../api/sonarcloud');
const formatter = require('../utils/formatter');
const { config } = require('../config');

/**
 * 生成品質報告
 * @param {Object} options - 指令選項
 * @returns {Promise<Object>} - 操作結果
 */
async function generateReport(options) {
  const {
    project = config.sonar.defaultProjectKey,
    template = 'summary',
    output = null,
    format = 'text'
  } = options;

  console.log(`正在為專案 ${project} 生成 ${template} 報告...`);
  
  try {
    // 建立 API 客戶端
    const api = new SonarCloudAPI();
    
    // 獲取資料
    console.log('獲取品質資料...');
    const data = await api.getFullQualityReport(project);
    
    // 根據模板生成報告
    let report;
    switch (template) {
      case 'summary':
        report = generateSummaryReport(data);
        break;
      case 'detailed':
        report = generateDetailedReport(data);
        break;
      case 'issues':
        report = generateIssuesReport(data);
        break;
      default:
        report = generateSummaryReport(data);
    }
    
    // 決定輸出檔名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = output || `${project}_${template}_report_${timestamp}`;
    
    // 儲存報告
    const filepath = formatter.saveToFile(report, filename, format);
    
    console.log(`報告已儲存至: ${filepath}`);
    
    return {
      success: true,
      message: `報告已儲存至: ${filepath}`,
      report,
      filepath
    };
  } catch (error) {
    console.error(`生成報告失敗: ${error.message}`);
    return {
      success: false,
      message: `生成報告失敗: ${error.message}`
    };
  }
}

/**
 * 生成摘要報告
 * @param {Object} data - 品質資料
 * @returns {Object} - 摘要報告
 */
function generateSummaryReport(data) {
  const { projectInfo, qualityGate, measures, issues } = data;
  
  // 將度量資料轉換為物件
  const metricsObj = measures.reduce((obj, measure) => {
    obj[measure.metric] = measure.value;
    return obj;
  }, {});
  
  // 計算各嚴重性問題數量
  const issuesBySeverity = issues ? issues.reduce((counts, issue) => {
    const severity = issue.severity || 'UNKNOWN';
    counts[severity] = (counts[severity] || 0) + 1;
    return counts;
  }, {}) : {};
  
  // 生成摘要報告
  return {
    project: {
      name: projectInfo.name,
      key: projectInfo.key,
      lastAnalysisDate: data.timestamp
    },
    qualityGate: {
      status: qualityGate.status,
      passed: qualityGate.status === 'OK'
    },
    metrics: {
      codeSize: metricsObj.ncloc || 'N/A',
      coverage: metricsObj.coverage || 'N/A',
      duplications: metricsObj.duplicated_lines_density || 'N/A',
      bugs: metricsObj.bugs || 'N/A',
      vulnerabilities: metricsObj.vulnerabilities || 'N/A',
      codeSmells: metricsObj.code_smells || 'N/A',
      securityHotspots: metricsObj.security_hotspots || 'N/A'
    },
    issues: {
      total: issues ? issues.length : 0,
      bySeverity: issuesBySeverity
    }
  };
}

/**
 * 生成詳細報告
 * @param {Object} data - 品質資料
 * @returns {Object} - 詳細報告
 */
function generateDetailedReport(data) {
  // 基於摘要報告擴展
  const summary = generateSummaryReport(data);
  
  // 添加更多詳細資訊
  return {
    ...summary,
    qualityGate: {
      ...summary.qualityGate,
      conditions: data.qualityGate.conditions || []
    },
    metrics: {
      ...summary.metrics,
      // 添加所有度量
      all: data.measures.reduce((obj, measure) => {
        obj[measure.metric] = measure.value;
        return obj;
      }, {})
    },
    issues: {
      ...summary.issues,
      // 添加問題類型統計
      byType: data.issues ? data.issues.reduce((counts, issue) => {
        const type = issue.type || 'UNKNOWN';
        counts[type] = (counts[type] || 0) + 1;
        return counts;
      }, {}) : {},
      // 添加最新問題
      latest: data.issues ? data.issues.slice(0, 10).map(issue => ({
        key: issue.key,
        message: issue.message,
        severity: issue.severity,
        type: issue.type,
        component: issue.component.replace('henry1266_pharmacy-pos:', '')
      })) : []
    },
    coverage: {
      overall: data.measures.find(m => m.metric === 'coverage')?.value || 'N/A',
      details: data.coverageDetails || []
    }
  };
}

/**
 * 生成問題報告
 * @param {Object} data - 品質資料
 * @returns {Object} - 問題報告
 */
function generateIssuesReport(data) {
  if (!data.issues || !Array.isArray(data.issues)) {
    return {
      project: data.projectInfo.name,
      timestamp: data.timestamp,
      issues: {
        total: 0,
        items: []
      }
    };
  }
  
  // 按嚴重性分組問題
  const issuesBySeverity = data.issues.reduce((groups, issue) => {
    const severity = issue.severity || 'UNKNOWN';
    if (!groups[severity]) {
      groups[severity] = [];
    }
    groups[severity].push({
      key: issue.key,
      message: issue.message,
      component: issue.component.replace('henry1266_pharmacy-pos:', ''),
      line: issue.line,
      type: issue.type,
      creationDate: issue.creationDate
    });
    return groups;
  }, {});
  
  return {
    project: data.projectInfo.name,
    timestamp: data.timestamp,
    issues: {
      total: data.issues.length,
      bySeverity: Object.keys(issuesBySeverity).reduce((obj, severity) => {
        obj[severity] = issuesBySeverity[severity].length;
        return obj;
      }, {}),
      items: Object.entries(issuesBySeverity).map(([severity, issues]) => ({
        severity,
        count: issues.length,
        issues
      }))
    }
  };
}

module.exports = generateReport;
