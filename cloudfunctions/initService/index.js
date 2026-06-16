process.env.TZ = "Asia/Shanghai";

const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 初始化数据库：创建集合 + 默认管理员
// 学生名单请通过管理员后台的"批量导入"功能导入，不在源码中硬编码
async function init() {
  try {
    // 创建集合（已存在则跳过）
    for (const coll of ["students", "sign_records", "admins"]) {
      try { await db.createCollection(coll); } catch (e) { /* 集合已存在 */ }
    }

    // 清除所有模拟绑定数据
    await db.collection("students").where({
      openid: db.RegExp({ regexp: "^mock_", options: "i" })
    }).update({ data: { openid: _.remove(), bindTime: _.remove() } });

    // 默认管理员
    const adminRes = await db.collection("admins").where({ account: "admin" }).get();
    if (adminRes.data.length === 0) {
      await db.collection("admins").add({ data: { account: "admin", password: "admin123" } });
    }

    return {
      success: true,
      message: "数据库初始化完成",
      details: {
        students: (await db.collection("students").count()).total,
        signRecords: (await db.collection("sign_records").count()).total,
        admins: (await db.collection("admins").count()).total,
      },
    };
  } catch (e) {
    return { success: false, errMsg: e.message || "初始化失败" };
  }
}

exports.main = async (event, context) => {
  if (event.action === "init") return await init();
  return { success: false, errMsg: `未知操作: ${event.action}` };
};
