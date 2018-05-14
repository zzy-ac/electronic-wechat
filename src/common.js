'use strict';

const AppConfig = require('./configuration');

const lan = AppConfig.readSettings('language');

let Common;
if (lan === 'zh-CN') {
  Common = require('./common_cn');
} else {
  Common = require('./common_en');
}

module.exports = Common;
