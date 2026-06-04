const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 初始化数据库集合和默认数据
async function init() {
  try {
    // 1. 创建 students 集合
    try {
      await db.createCollection("students");
      console.log("students 集合创建成功");
    } catch (e) {
      if (e.errCode === -502005) {
        console.log("students 集合已存在，跳过");
      } else {
        throw e;
      }
    }

    // 2. 创建 sign_records 集合
    try {
      await db.createCollection("sign_records");
      console.log("sign_records 集合创建成功");
    } catch (e) {
      if (e.errCode === -502005) {
        console.log("sign_records 集合已存在，跳过");
      } else {
        throw e;
      }
    }

    // 3. 创建 admins 集合
    try {
      await db.createCollection("admins");
      console.log("admins 集合创建成功");
    } catch (e) {
      if (e.errCode === -502005) {
        console.log("admins 集合已存在，跳过");
      } else {
        throw e;
      }
    }

    // 4. 检查并创建默认管理员账号
    const adminRes = await db.collection("admins").where({ account: "admin" }).get();
    if (adminRes.data.length === 0) {
      await db.collection("admins").add({
        data: {
          account: "admin",
          password: "123456",
        },
      });
      console.log("默认管理员账号创建成功 (admin / 123456)");
    }

    // 5. 检查并导入示例学生数据（学号前有 openid 为 null，表示未绑定）
    const studentCount = await db.collection("students").count();
    if (studentCount.total === 0) {
      const sampleStudents = [
        { sid: "2024001", name: "张三", openid: null },
        { sid: "2024002", name: "李四", openid: null },
        { sid: "2024003", name: "王五", openid: null },
        { sid: "2024004", name: "赵六", openid: null },
        { sid: "2024005", name: "陈七", openid: null },
      ];
      for (const s of sampleStudents) {
        await db.collection("students").add({ data: s });
      }
      console.log(`导入 ${sampleStudents.length} 名示例学生`);
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
    console.error("初始化失败:", e);
    return {
      success: false,
      errMsg: e.message || "初始化失败",
    };
  }
}

exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case "init":
      return await init();
    default:
      return { success: false, errMsg: `未知操作: ${action}` };
  }
};
