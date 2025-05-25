/**
 * 資料儲存工具
 * 負責管理資料的儲存與讀取
 */

const fs = require('fs');
const path = require('path');
const { config } = require('../config');

class Storage {
  constructor(outputDir = config.output.dir) {
    this.outputDir = outputDir;
    this._ensureOutputDirExists();
  }

  /**
   * 確保輸出目錄存在
   * @private
   */
  _ensureOutputDirExists() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 儲存資料到檔案
   * @param {Object} data - 要儲存的資料
   * @param {string} filename - 檔案名稱
   * @returns {string} - 儲存的檔案路徑
   */
  saveData(data, filename) {
    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    return filepath;
  }

  /**
   * 從檔案讀取資料
   * @param {string} filename - 檔案名稱
   * @returns {Object} - 讀取的資料
   */
  loadData(filename) {
    const filepath = path.join(this.outputDir, filename);
    if (!fs.existsSync(filepath)) {
      throw new Error(`檔案不存在: ${filepath}`);
    }
    
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * 列出目錄中的所有檔案
   * @param {string} extension - 檔案副檔名過濾器 (可選)
   * @returns {Array<string>} - 檔案名稱列表
   */
  listFiles(extension = null) {
    this._ensureOutputDirExists();
    
    const files = fs.readdirSync(this.outputDir);
    
    if (extension) {
      return files.filter(file => file.endsWith(extension));
    }
    
    return files;
  }

  /**
   * 檢查檔案是否存在
   * @param {string} filename - 檔案名稱
   * @returns {boolean} - 檔案是否存在
   */
  fileExists(filename) {
    const filepath = path.join(this.outputDir, filename);
    return fs.existsSync(filepath);
  }

  /**
   * 刪除檔案
   * @param {string} filename - 檔案名稱
   * @returns {boolean} - 是否成功刪除
   */
  deleteFile(filename) {
    const filepath = path.join(this.outputDir, filename);
    if (!fs.existsSync(filepath)) {
      return false;
    }
    
    fs.unlinkSync(filepath);
    return true;
  }
}

module.exports = new Storage();
