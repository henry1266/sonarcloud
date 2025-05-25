/**
 * SonarCloud API 介接模組
 * 負責與 SonarCloud API 通訊並獲取資料
 */

const axios = require('axios');
const { config } = require('../config');

class SonarCloudAPI {
  constructor(token = config.sonar.token, hostUrl = config.sonar.hostUrl, organization = config.sonar.organization) {
    this.token = token;
    this.hostUrl = hostUrl;
    this.organization = organization;
    this.apiBase = `${hostUrl}/api`;
    
    // 設定 axios 實例
    this.client = axios.create({
      baseURL: this.apiBase,
      auth: {
        username: this.token,
        password: ''  // SonarCloud API 使用 token 作為使用者名稱，密碼為空
      }
    });
  }

  /**
   * 獲取專案資訊
   * @param {string} projectKey - 專案金鑰
   * @returns {Promise<Object>} - 專案資訊
   */
  async getProjectInfo(projectKey) {
    try {
      const response = await this.client.get('/projects/search', {
        params: {
          projects: projectKey,
          organization: this.organization
        }
      });
      
      return response.data.components[0] || null;
    } catch (error) {
      this._handleError(error, '獲取專案資訊失敗');
    }
  }

  /**
   * 獲取專案品質閘道狀態
   * @param {string} projectKey - 專案金鑰
   * @returns {Promise<Object>} - 品質閘道狀態
   */
  async getQualityGateStatus(projectKey) {
    try {
      const response = await this.client.get('/qualitygates/project_status', {
        params: {
          projectKey,
          organization: this.organization
        }
      });
      
      return response.data.projectStatus;
    } catch (error) {
      this._handleError(error, '獲取品質閘道狀態失敗');
    }
  }

  /**
   * 獲取專案度量資料
   * @param {string} projectKey - 專案金鑰
   * @param {string} metricKeys - 度量指標，逗號分隔
   * @returns {Promise<Object>} - 度量資料
   */
  async getProjectMeasures(projectKey, metricKeys = 'ncloc,coverage,duplicated_lines_density,bugs,vulnerabilities,code_smells,security_hotspots') {
    try {
      const response = await this.client.get('/measures/component', {
        params: {
          component: projectKey,
          metricKeys,
          organization: this.organization
        }
      });
      
      return response.data.component.measures;
    } catch (error) {
      this._handleError(error, '獲取專案度量資料失敗');
    }
  }

  /**
   * 獲取專案問題清單
   * @param {string} projectKey - 專案金鑰
   * @param {Object} options - 查詢選項
   * @returns {Promise<Array>} - 問題清單
   */
  async getIssues(projectKey, options = {}) {
    try {
      const params = {
        componentKeys: projectKey,
        organization: this.organization,
        ...options
      };
      
      const response = await this.client.get('/issues/search', { params });
      
      return response.data.issues;
    } catch (error) {
      this._handleError(error, '獲取專案問題清單失敗');
    }
  }

  /**
   * 獲取程式碼覆蓋率詳情
   * @param {string} projectKey - 專案金鑰
   * @returns {Promise<Object>} - 覆蓋率詳情
   */
  async getCoverageDetails(projectKey) {
    try {
      const response = await this.client.get('/measures/component_tree', {
        params: {
          component: projectKey,
          metricKeys: 'coverage,lines_to_cover,uncovered_lines',
          strategy: 'children',
          organization: this.organization
        }
      });
      
      return response.data.components;
    } catch (error) {
      this._handleError(error, '獲取程式碼覆蓋率詳情失敗');
    }
  }

  /**
   * 獲取專案完整品質報告
   * @param {string} projectKey - 專案金鑰
   * @returns {Promise<Object>} - 完整品質報告
   */
  async getFullQualityReport(projectKey) {
    try {
      // 並行獲取多個資料來源
      const [projectInfo, qualityGate, measures, issues, coverageDetails] = await Promise.all([
        this.getProjectInfo(projectKey),
        this.getQualityGateStatus(projectKey),
        this.getProjectMeasures(projectKey),
        this.getIssues(projectKey),
        this.getCoverageDetails(projectKey)
      ]);
      
      return {
        projectInfo,
        qualityGate,
        measures,
        issues,
        coverageDetails,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this._handleError(error, '獲取專案完整品質報告失敗');
    }
  }

  /**
   * 處理 API 錯誤
   * @private
   * @param {Error} error - 錯誤物件
   * @param {string} message - 錯誤訊息前綴
   */
  _handleError(error, message) {
    if (error.response) {
      // API 回應錯誤
      console.error(`${message}: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      throw new Error(`${message}: ${error.response.status} - ${error.response.data.errors?.[0]?.msg || 'API 回應錯誤'}`);
    } else if (error.request) {
      // 請求未收到回應
      console.error(`${message}: 無回應 - ${error.message}`);
      throw new Error(`${message}: 無回應 - 請檢查網路連線或 API 端點`);
    } else {
      // 請求設定錯誤
      console.error(`${message}: ${error.message}`);
      throw new Error(`${message}: ${error.message}`);
    }
  }
}

module.exports = SonarCloudAPI;
