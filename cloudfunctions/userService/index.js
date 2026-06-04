const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// ========== 学生微信登录 ==========
// 获取 openid，检查是否已绑定学号
async function studentLogin() {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 查询该 openid 是否已绑定学生
  const res = await db.collection("students").where({ openid }).get();

  if (res.data.length > 0) {
    return {
      success: true,
      bound: true,
      student: res.data[0],
    };
  }

  return {
    success: true,
    bound: false,
    openid,
  };
}

// ========== 验证学号并绑定微信 ==========
// 通过学号+姓名验证学生身份，绑定 openid
// 防止代签：每个学号只能绑定一个微信，每个微信只能绑定一个学号
async function bindStudent(openid, sid, name) {
  // 检查该学号是否已被其他微信绑定
  const existStudent = await db.collection("students").where({ sid }).get();

  if (existStudent.data.length === 0) {
    return { success: false, errMsg: "学号不存在，请联系老师确认" };
  }

  const student = existStudent.data[0];

  // 检查学号是否已被其他微信绑定
  if (student.openid && student.openid !== openid) {
    return { success: false, errMsg: "该学号已被其他微信绑定，如需换绑请联系老师" };
  }

  // 检查该微信是否已绑定其他学号
  const existOpenid = await db.collection("students").where({ openid }).get();
  if (existOpenid.data.length > 0 && existOpenid.data[0].sid !== sid) {
    return { success: false, errMsg: "该微信已绑定其他学号，请先解绑" };
  }

  // 验证姓名是否匹配
  if (student.name !== name) {
    return { success: false, errMsg: "姓名与学号不匹配" };
  }

  // 执行绑定
  await db.collection("students").doc(student._id).update({
    data: {
      openid,
      bindTime: db.serverDate(),
    },
  });

  // 返回更新后的学生信息
  const updated = await db.collection("students").doc(student._id).get();

  return {
    success: true,
    bound: true,
    student: updated.data,
  };
}

// ========== 获取学生信息 ==========
async function getStudentInfo() {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const res = await db.collection("students").where({ openid }).get();

  if (res.data.length === 0) {
    return { success: false, errMsg: "未绑定学生信息" };
  }

  return {
    success: true,
    student: res.data[0],
  };
}

// ========== 管理员登录 ==========
async function adminLogin(account, password) {
  const res = await db.collection("admins").where({ account }).get();

  if (res.data.length === 0) {
    return { success: false, errMsg: "账号不存在" };
  }

  const admin = res.data[0];

  if (admin.password !== password) {
    return { success: false, errMsg: "密码错误" };
  }

  return {
    success: true,
    admin: {
      account: admin.account,
    },
  };
}

// ========== 修改管理员密码 ==========
async function changePassword(account, oldPassword, newPassword) {
  if (!newPassword || newPassword.length < 4) {
    return { success: false, errMsg: "新密码长度不能少于4位" };
  }

  const res = await db.collection("admins").where({ account }).get();

  if (res.data.length === 0) {
    return { success: false, errMsg: "账号不存在" };
  }

  const admin = res.data[0];

  if (admin.password !== oldPassword) {
    return { success: false, errMsg: "原密码错误" };
  }

  await db.collection("admins").doc(admin._id).update({
    data: { password: newPassword },
  });

  return { success: true, message: "密码修改成功" };
}

// ========== 云函数入口 ==========
exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (action) {
    case "studentLogin":
      return await studentLogin();
    case "bindStudent":
      return await bindStudent(openid, event.sid, event.name);
    case "getStudentInfo":
      return await getStudentInfo();
    case "adminLogin":
      return await adminLogin(event.account, event.password);
    case "changePassword":
      return await changePassword(event.account, event.oldPassword, event.newPassword);
    default:
      return { success: false, errMsg: `未知操作: ${action}` };
  }
};
