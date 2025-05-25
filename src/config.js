/**
 * 配置檔案載入模組
 * 負責載入環境變數並提供配置選項
 */

require('dotenv').config();

const config = {
  // SonarCloud API 設定
  sonar: {
    token: process.env.SONAR_TOKEN,
    organization: process.env.SONAR_ORGANIZATION || 'henry22133',
    hostUrl: process.env.SONAR_HOST_URL || 'https://sonarcloud.io',
    defaultProjectKey: process.env.DEFAULT_PROJECT_KEY || 'henry1266_pharmacy-pos'
  },
  
  // 輸出設定
  output: {
    dir: process.env.OUTPUT_DIR || './output',
    defaultFormat: process.env.DEFAULT_FORMAT || 'json'
  }
};

// 驗證必要的配置
const validateConfig = () => {
  if (!config.sonar.token) {
    console.error('錯誤: 未設定 SONAR_TOKEN 環境變數。請在 .env 檔案中設定。');
    process.exit(1);
  }
};

module.exports = {
  config,
  validateConfig
};
