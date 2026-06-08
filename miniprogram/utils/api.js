// 云函数调用封装

/**
 * 调用云函数
 * @param {string} name 云函数名称
 * @param {object} data 请求参数
 * @returns {Promise<any>}
 */
async function callCloud(name, data = {}) {
  try {
    const res = await wx.cloud.callFunction({ name, data });
    return res.result;
  } catch (err) {
    console.error(`[${name}] 调用失败:`, err);
    return { success: false, errMsg: err.errMsg || "云函数调用失败" };
  }
}

// ========== 用户服务 ==========

/** 学生微信登录 — 获取 openid，检查是否已绑定 */
function studentLogin() {
  return callCloud("userService", { action: "studentLogin" });
}

/** 验证学号并绑定微信 */
function bindStudent(sid, name) {
  return callCloud("userService", { action: "bindStudent", sid, name });
}

/** 获取学生信息 */
function getStudentInfo() {
  return callCloud("userService", { action: "getStudentInfo" });
}

/** 管理员登录 */
function adminLogin(account, password) {
  return callCloud("userService", { action: "adminLogin", account, password });
}

/** 修改管理员密码 */
function changeAdminPassword(account, oldPwd, newPwd) {
  return callCloud("userService", { action: "changePassword", account, oldPassword: oldPwd, newPassword: newPwd });
}

// ========== 签到服务 ==========

/** 学生签到 */
function checkIn(location) {
  return callCloud("signService", { action: "checkIn", location });
}

/** 获取本人签到记录 */
function getMyRecords(page = 1, pageSize = 20) {
  return callCloud("signService", { action: "getMyRecords", page, pageSize });
}

/** 管理员：获取所有学生列表（分页、绑定状态筛选） */
function getAllStudents(keyword = "", page = 1, pageSize = 20, bindStatus = "") {
  return callCloud("signService", { action: "getAllStudents", keyword, page, pageSize, bindStatus });
}

/** 管理员：获取所有签到记录（支持学号/姓名/日期筛选） */
function getAllRecords({ date, keyword, page = 1, pageSize = 20 } = {}) {
  return callCloud("signService", { action: "getAllRecords", date, keyword, page, pageSize });
}

/** 管理员：获取导出数据 */
function exportRecords({ date, keyword } = {}) {
  return callCloud("signService", { action: "exportRecords", date, keyword });
}

/** 批量导入学生（CSV 文本） */
function batchImportStudents(csvText) {
  return callCloud("signService", { action: "batchImportStudents", csvText });
}

/** 逆地理编码：GPS坐标 → 街道地址 */
function reverseGeocode(lat, lng) {
  return callCloud("signService", { action: "reverseGeocode", lat, lng });
}

// ========== 初始化服务 ==========

/** 初始化数据库（创建集合 + 默认数据） */
function initDatabase() {
  return callCloud("initService", { action: "init" });
}

/** 导入学生名单（仅导入，不创建集合） */
function importStudents() {
  return callCloud("initService", { action: "import" });
}

/** 模拟绑定：给所有未绑定学生写入模拟 openid */
function mockBind() {
  return callCloud("initService", { action: "mockBind" });
}

/** 模拟签到：给所有已绑定学生生成今日签到记录 */
function mockSign() {
  return callCloud("initService", { action: "mockSign" });
}

module.exports = {
  studentLogin,
  bindStudent,
  getStudentInfo,
  adminLogin,
  changeAdminPassword,
  checkIn,
  getMyRecords,
  getAllStudents,
  getAllRecords,
  exportRecords,
  reverseGeocode,
  batchImportStudents,
  initDatabase,
  importStudents,
  mockBind,
  mockSign,
};
