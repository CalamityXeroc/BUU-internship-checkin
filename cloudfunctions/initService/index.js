const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 真实学生名单
const STUDENTS = [
  { sid: "2024010320024", name: "龙子昕" },
  { sid: "2024010320020", name: "梁李琪" },
  { sid: "2024010320041", name: "赵琪翔" },
  { sid: "2024010320034", name: "吴名江" },
  { sid: "2024010320021", name: "刘润" },
  { sid: "2024010320011", name: "范依琪" },
  { sid: "2024010320018", name: "李梓萌" },
  { sid: "2024010319039", name: "张晟堃" },
  { sid: "2024010319024", name: "刘泽阳" },
  { sid: "2024010320004", name: "陈昀霆" },
  { sid: "2024010320015", name: "凯丽比努尔·艾麦提" },
  { sid: "2024010320009", name: "冯香宁" },
  { sid: "2024010320007", name: "付豪" },
  { sid: "2024010320046", name: "张樱罗" },
  { sid: "2024010320045", name: "张旭" },
  { sid: "2024010320044", name: "周美佳" },
  { sid: "2024010319023", name: "李盈" },
  { sid: "2024010320047", name: "张愉宁" },
  { sid: "2024010319003", name: "程思翔" },
  { sid: "2024010320005", name: "陈志轩" },
  { sid: "2024010319011", name: "郭子涵" },
  { sid: "2024010320010", name: "房新雅" },
  { sid: "2024010319031", name: "吴天俣" },
  { sid: "2024010320035", name: "王启航" },
  { sid: "2024010319037", name: "张博岩" },
  { sid: "2024010319007", name: "郭韬" },
  { sid: "2024010319042", name: "赵依婷" },
  { sid: "2024010320043", name: "曾佳宜" },
  { sid: "2024010320001", name: "阿卜杜麦吉提·米热阿卜杜拉" },
  { sid: "2024010319002", name: "曹俊凯" },
  { sid: "2024010319001", name: "陈超文" },
  { sid: "2024010320002", name: "陈敏学" },
  { sid: "2024010319004", name: "陈文灏" },
  { sid: "2024010320003", name: "程士通" },
  { sid: "2024010319005", name: "崔哲文" },
  { sid: "2024010319006", name: "丁子琪" },
  { sid: "2024010320006", name: "董易达" },
  { sid: "2024010320008", name: "房彤伟" },
  { sid: "2024010320012", name: "高欣宇" },
  { sid: "2024010319009", name: "耿玉茔" },
  { sid: "2024010319010", name: "耿源浩" },
  { sid: "2024010319008", name: "关文博" },
  { sid: "2024010320013", name: "郭一鸣" },
  { sid: "2024010320014", name: "何健豪" },
  { sid: "2024010319012", name: "何建侠" },
  { sid: "2024010319013", name: "何宣翰" },
  { sid: "2024010319014", name: "何志成" },
  { sid: "2024010319015", name: "姜涵" },
  { sid: "2024010319016", name: "李方静" },
  { sid: "2024010320016", name: "李涵" },
  { sid: "2024010320017", name: "李嘉鸣" },
  { sid: "2024010320019", name: "李金权" },
  { sid: "2024010319022", name: "李文硕" },
  { sid: "2024010320025", name: "李志跃" },
  { sid: "2024010319018", name: "刘嘉歆" },
  { sid: "2024010319017", name: "刘金福" },
  { sid: "2024010319019", name: "刘景宣" },
  { sid: "2024010319020", name: "刘恰" },
  { sid: "2024010320022", name: "刘忆伦" },
  { sid: "2024010320023", name: "刘雨潼" },
  { sid: "2024010319021", name: "卢思琪" },
  { sid: "2024010319025", name: "米天灏" },
  { sid: "2024010319026", name: "宁丽郡" },
  { sid: "2024010320026", name: "齐旻涵" },
  { sid: "2024010320028", name: "冉启豪" },
  { sid: "2024010320030", name: "沈轩" },
  { sid: "2024010319028", name: "沈姝均" },
  { sid: "2024010319027", name: "沈曈" },
  { sid: "2024010320029", name: "宋伯涵" },
  { sid: "2024010319029", name: "宋宇航" },
  { sid: "2024010319030", name: "孙雨天" },
  { sid: "2024010320032", name: "孙宇韬" },
  { sid: "2024010320033", name: "田芯语" },
  { sid: "2024010320037", name: "王熙" },
  { sid: "2024010319032", name: "王译墨" },
  { sid: "2024010320036", name: "魏怡暄" },
  { sid: "2024010320038", name: "夏培豪" },
  { sid: "2024010319033", name: "杨景清" },
  { sid: "2024010319034", name: "杨丽丹" },
  { sid: "2024010319035", name: "姚欣雨" },
  { sid: "2024010319036", name: "尹宇航" },
  { sid: "2024010320039", name: "余庆双" },
  { sid: "2024010319040", name: "张圣阳" },
  { sid: "2024010320048", name: "张羽欣" },
  { sid: "2024010320049", name: "张哲轩" },
  { sid: "2024010319044", name: "张紫熹" },
  { sid: "2024010320040", name: "赵滨楠" },
  { sid: "2024010319038", name: "郑康宁" },
  { sid: "2024010319041", name: "郑午阳" },
  { sid: "2024010319045", name: "周忠轩" },
  { sid: "2024010320042", name: "朱家彤" },
];

async function init() {
  try {
    // 创建集合（已存在则跳过）
    for (const coll of ["students", "sign_records", "admins"]) {
      try {
        await db.createCollection(coll);
      } catch (e) { /* 忽略，集合已存在 */ }
    }

    // 默认管理员
    const adminRes = await db.collection("admins").where({ account: "admin" }).get();
    if (adminRes.data.length === 0) {
      await db.collection("admins").add({ data: { account: "admin", password: "123456" } });
    }

    // 导入学生：先查已有学号，只插新数据（一次查询代替 92 次查询）
    const existingRes = await db.collection("students").field({ sid: true }).limit(200).get();
    const existingSids = new Set(existingRes.data.map(s => s.sid));
    let imported = 0;
    let skipped = 0;
    for (const s of STUDENTS) {
      if (existingSids.has(s.sid)) { skipped++; continue; }
      await db.collection("students").add({ data: { sid: s.sid, name: s.name } });
      imported++;
    }

    return {
      success: true,
      message: `导入 ${imported} 人，已存在跳过 ${skipped} 人`,
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
  if (event.action === "import") return await importStudents();
  if (event.action === "mockBind") return await mockBind();
  if (event.action === "mockSign") return await mockSign();
  return { success: false, errMsg: `未知操作: ${event.action}` };
};

// ========== 模拟绑定：为所有未绑定学生生成模拟 openid ==========
async function mockBind() {
  try {
    const res = await db.collection("students")
      .where(_.or([{ openid: null }, { openid: _.exists(false) }]))
      .limit(200).get();

    let count = 0;
    for (const s of res.data) {
      await db.collection("students").doc(s._id).update({
        data: { openid: `mock_${s.sid}`, bindTime: db.serverDate() },
      });
      count++;
    }
    return { success: true, message: `已为 ${count} 名学生模拟绑定微信` };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
}

// ========== 模拟签到：为所有已绑定学生生成今日签到记录 ==========
async function mockSign() {
  try {
    // 获取所有已绑定学生
    const res = await db.collection("students")
      .where(_.and([{ openid: _.exists(true) }, { openid: _.neq(null) }, { openid: _.neq("") }]))
      .limit(200).get();

    if (res.data.length === 0) {
      return { success: false, errMsg: "没有已绑定的学生，请先执行模拟绑定" };
    }

    // 今日时间范围
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    // 获取今日已签到 openid 集合
    const todayRes = await db.collection("sign_records")
      .where({ signTime: _.gte(todayStart).and(_.lte(todayEnd)) })
      .field({ openid: true })
      .limit(1000).get();
    const signedSet = new Set(todayRes.data.map(r => r.openid));

    // 校园周边坐标偏移范围
    const baseLat = 39.9620;
    const baseLng = 116.3528;

    let count = 0;
    for (const s of res.data) {
      if (signedSet.has(s.openid)) continue; // 今日已签

      const lat = (baseLat + (Math.random() - 0.5) * 0.005).toFixed(6);
      const lng = (baseLng + (Math.random() - 0.5) * 0.005).toFixed(6);

      await db.collection("sign_records").add({
        data: {
          openid: s.openid,
          sid: s.sid,
          name: s.name,
          location: `${lat}, ${lng}`,
          signTime: db.serverDate(),
        },
      });
      count++;
    }
    return { success: true, message: `今日签到 ${count} 人，已签跳过 ${res.data.length - count} 人` };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
}

// 只导入学生，不创建集合
async function importStudents() {
  try {
    const existingRes = await db.collection("students").field({ sid: true }).limit(200).get();
    const existingSids = new Set(existingRes.data.map(s => s.sid));
    let imported = 0;
    let skipped = 0;
    for (const s of STUDENTS) {
      if (existingSids.has(s.sid)) { skipped++; continue; }
      await db.collection("students").add({ data: { sid: s.sid, name: s.name } });
      imported++;
    }
    return { success: true, message: `导入 ${imported} 人，已存在跳过 ${skipped} 人` };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
}
