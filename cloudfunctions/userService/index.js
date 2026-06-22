process.env.TZ = "Asia/Shanghai";

const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// ========== 学生微信登录 ==========
async function studentLogin() {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const res = await db.collection("students").where({ openid }).get();

  if (res.data.length > 0) {
    return { success: true, bound: true, student: { sid: res.data[0].sid, name: res.data[0].name, bindTime: res.data[0].bindTime } };
  }

  return { success: true, bound: false, openid };
}

// ========== 验证学号并绑定微信 ==========
async function bindStudent(openid, sid, name) {
  const existStudent = await db.collection("students").where({ sid }).get();

  if (existStudent.data.length === 0) {
    return { success: false, errMsg: "学号不存在，请联系老师确认" };
  }

  const student = existStudent.data[0];

  if (student.openid && student.openid !== openid) {
    return { success: false, errMsg: "该学号已被其他微信绑定，如需换绑请联系老师" };
  }

  const existOpenid = await db.collection("students").where({ openid }).get();
  if (existOpenid.data.length > 0 && existOpenid.data[0].sid !== sid) {
    // H3: 不泄露已绑定学号的具体信息
    return { success: false, errMsg: "该微信已绑定其他学号，请联系老师处理" };
  }

  if (student.name !== name) {
    return { success: false, errMsg: "姓名与学号不匹配" };
  }

  await db.collection("students").doc(student._id).update({
    data: { openid, bindTime: db.serverDate() },
  });

  const updated = await db.collection("students").doc(student._id).get();

  return { success: true, bound: true, student: { sid: updated.data.sid, name: updated.data.name, bindTime: updated.data.bindTime } };
}

// ========== 获取学生信息 ==========
async function getStudentInfo() {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const res = await db.collection("students").where({ openid }).get();

  if (res.data.length === 0) {
    return { success: false, errMsg: "未绑定学生信息" };
  }

  return { success: true, student: { sid: res.data[0].sid, name: res.data[0].name, bindTime: res.data[0].bindTime } };
}

// ========== 管理员登录（含暴力破解保护） ==========
async function adminLogin(account, password) {
  const res = await db.collection("admins").where({ account }).get();

  if (res.data.length === 0) {
    return { success: false, errMsg: "账号不存在" };
  }

  const admin = res.data[0];

  // 暴力破解保护 — 5 次失败后锁定 15 分钟
  const now = Date.now();
  if (admin.lockUntil && now < admin.lockUntil) {
    const mins = Math.ceil((admin.lockUntil - now) / 60000);
    return { success: false, errMsg: `账号已锁定，请 ${mins} 分钟后重试` };
  }

  if (admin.password !== password) {
    const failCount = (admin.failCount || 0) + 1;
    const updateData = { failCount };
    if (failCount >= 5) {
      updateData.lockUntil = now + 15 * 60 * 1000;
      updateData.failCount = 0;
    }
    await db.collection("admins").doc(admin._id).update({ data: updateData });
    return { success: false, errMsg: failCount >= 5 ? "密码错误次数过多，账号已锁定 15 分钟" : `密码错误（已错 ${failCount} 次，5 次后锁定）` };
  }

  // 登录成功：清除锁定
  await db.collection("admins").doc(admin._id).update({
    data: { failCount: 0, lockUntil: null },
  });

  return { success: true, admin: { account: admin.account } };
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

  await db.collection("admins").doc(admin._id).update({ data: { password: newPassword } });

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
