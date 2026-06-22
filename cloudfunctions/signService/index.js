process.env.TZ = "Asia/Shanghai";

const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const https = require("https");


// 高德地图 Web服务 API Key（去 https://console.amap.com/ 申请）
const AMAP_KEY = "YOUR_AMAP_WEB_SERVICE_KEY";

// ========== 学生签到 ==========
// 记录签到位置和时间，防止同一天重复签到
async function checkIn(openid, location) {
  // 查询学生信息
  const studentRes = await db.collection("students").where({ openid }).get();

  if (studentRes.data.length === 0) {
    return { success: false, errMsg: "未绑定学生信息，请先登录" };
  }

  const student = studentRes.data[0];

  // 检查今天是否已签到（使用服务器时间当天范围）
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  const existRes = await db
    .collection("sign_records")
    .where({
      openid,
      signTime: _.gte(todayStart).and(_.lte(todayEnd)),
    })
    .get();

  if (existRes.data.length > 0) {
    return {
      success: false,
      errMsg: "今日已签到，无需重复签到",
      alreadySigned: true,
      record: existRes.data[0],
    };
  }

  // 写入签到记录
  const record = {
    openid,
    sid: student.sid,
    name: student.name,
    location: location || "未知位置",
    signTime: db.serverDate(),
  };

  const addRes = await db.collection("sign_records").add({ data: record });

  return {
    success: true,
    message: "签到成功",
    record: {
      ...record,
      _id: addRes._id,
      signTime: now,
    },
  };
}

// ========== 获取本人签到记录 ==========
async function getMyRecords(openid, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;

  const [recordsRes, countRes] = await Promise.all([
    db
      .collection("sign_records")
      .where({ openid })
      .orderBy("signTime", "desc")
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection("sign_records").where({ openid }).count(),
  ]);

  return {
    success: true,
    records: recordsRes.data,
    total: countRes.total,
    page,
    pageSize,
    hasMore: skip + recordsRes.data.length < countRes.total,
  };
}

// ========== 管理员：获取所有学生列表（支持绑定状态筛选） ==========
async function getAllStudents(keyword = "", page = 1, pageSize = 20, bindStatus = "") {
  const skip = (page - 1) * pageSize;
  const parts = [];

  if (keyword) {
    parts.push(_.or([
      { name: db.RegExp({ regexp: keyword, options: "i" }) },
      { sid: db.RegExp({ regexp: keyword, options: "i" }) },
    ]));
  }

  // 绑定状态筛选：bound=已绑定(openid非空) unbound=未绑定(openid为空)
  if (bindStatus === "bound") {
    parts.push({ openid: _.and([_.exists(true), _.neq(null), _.neq("")]) });
  } else if (bindStatus === "unbound") {
    parts.push(_.or([{ openid: null }, { openid: _.exists(false) }]));
  }

  const conditions = parts.length > 0 ? _.and(parts) : {};

  let query = db.collection("students").where(conditions);

  const [dataRes, countRes] = await Promise.all([
    query.orderBy("sid", "asc").skip(skip).limit(pageSize).get(),
    db.collection("students").where(conditions).count(),
  ]);

  return {
    success: true,
    students: dataRes.data,
    total: countRes.total,
    page,
    pageSize,
    hasMore: skip + dataRes.data.length < countRes.total,
  };
}

// ========== 管理员：获取所有签到记录（支持筛选） ==========
async function getAllRecords({ date, keyword, page = 1, pageSize = 20 } = {}) {
  const skip = (page - 1) * pageSize;
  const parts = [];

  if (keyword) {
    parts.push(_.or([
      { sid: db.RegExp({ regexp: keyword, options: "i" }) },
      { name: db.RegExp({ regexp: keyword, options: "i" }) },
    ]));
  }

  if (date) {
    const dateStart = new Date(date + "T00:00:00");
    const dateEnd = new Date(date + "T23:59:59");
    parts.push({ signTime: _.gte(dateStart).and(_.lte(dateEnd)) });
  }

  const conditions = parts.length > 0 ? _.and(parts) : {};

  let query = db.collection("sign_records").where(conditions);

  const [recordsRes, countRes] = await Promise.all([
    query.orderBy("signTime", "desc").skip(skip).limit(pageSize).get(),
    db.collection("sign_records").where(conditions).count(),
  ]);

  return {
    success: true,
    records: recordsRes.data,
    total: countRes.total,
    page,
    pageSize,
    hasMore: skip + recordsRes.data.length < countRes.total,
  };
}

// ========== 管理员：导出签到数据（不分页，最多5000条） ==========
async function exportRecords({ date, keyword } = {}) {
  const parts = [];

  if (keyword) {
    parts.push(_.or([
      { sid: db.RegExp({ regexp: keyword, options: "i" }) },
      { name: db.RegExp({ regexp: keyword, options: "i" }) },
    ]));
  }

  if (date) {
    const dateStart = new Date(date + "T00:00:00");
    const dateEnd = new Date(date + "T23:59:59");
    parts.push({ signTime: _.gte(dateStart).and(_.lte(dateEnd)) });
  }

  const conditions = parts.length > 0 ? _.and(parts) : {};

  const res = await db
    .collection("sign_records")
    .where(conditions)
    .orderBy("signTime", "desc")
    .limit(5000)
    .get();

  return {
    success: true,
    records: res.data,
    total: res.data.length,
  };
}

// ========== 逆地理编码（坐标 → 地址） ==========
// 高德逆地理编码：GPS坐标 → 街道地址
// docs: https://lbs.amap.com/api/webservice/guide/api/georegeo
async function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    // 高德参数顺序是 lng,lat
    const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${AMAP_KEY}&extensions=base`;
    https.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          if (data.status === "1" && data.regeocode) {
            const rc = data.regeocode;
            const addr = rc.addressComponent;
            // 拼接：省+市+区+街道+门牌号
            const parts = [
              addr.province || "",
              addr.city || "",
              addr.district || "",
              addr.township || "",
            ];
            const street = addr.streetNumber;
            const streetStr = street ? `${street.street || ""}${street.number || ""}` : "";
            const formatted = [...parts, streetStr].filter(Boolean).join("");
            resolve({
              success: true,
              address: formatted,
              formatted: rc.formatted_address || formatted,
            });
          } else {
            resolve({
              success: false,
              errMsg: data.info || "逆地理编码失败",
              fallback: `${lat}, ${lng}`,
            });
          }
        } catch (e) {
          resolve({ success: false, errMsg: "解析失败", fallback: `${lat}, ${lng}` });
        }
      });
    }).on("error", (e) => {
      resolve({ success: false, errMsg: e.message, fallback: `${lat}, ${lng}` });
    });
  });
}

// ========== 批量导入学生 ==========
async function batchImportStudents(csvText) {
  try {
    if (!csvText || !csvText.trim()) {
      return { success: false, errMsg: "CSV 内容为空" };
    }

    const lines = csvText.trim().split("\n");
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(",");
      if (parts.length < 2) {
        errors.push(`第${i + 1}行格式错误`);
        continue;
      }

      // 自动识别表头（第一行包含"姓名"或"学号"）
      const isHeader = /姓名|学号|sid|name/i.test(parts[0]) || /姓名|学号|sid|name/i.test(parts[1]);
      if (i === 0 && isHeader) continue;

      // 自动识别哪列是学号，哪列是姓名
      let name, sid;
      if (/^\d{10,}$/.test(parts[0])) {
        sid = parts[0].trim();
        name = parts[1].trim();
      } else {
        name = parts[0].trim();
        sid = parts[1].trim();
      }

      if (!sid || !name) {
        errors.push(`第${i + 1}行数据不完整`);
        continue;
      }

      // 检查学号是否已存在
      const exist = await db.collection("students").where({ sid }).get();
      if (exist.data.length > 0) {
        skipped++;
        continue;
      }

      try {
        await db.collection("students").add({ data: { sid, name } });
        imported++;
      } catch (e) {
        errors.push(`${name}(${sid}): ${e.message || "写入失败"}`);
      }
    }

    return {
      success: true,
      imported,
      skipped,
      total: imported + skipped,
      errors: errors.length > 0 ? errors.slice(0, 10) : [],
    };
  } catch (e) {
    return { success: false, errMsg: `导入异常: ${e.message || "未知错误"}` };
  }
}

// ========== 管理员：新增单个学生 ==========
async function addStudent(sid, name) {
  if (!sid || !name) {
    return { success: false, errMsg: "学号和姓名不能为空" };
  }
  // 检查学号是否已存在
  const exist = await db.collection("students").where({ sid }).get();
  if (exist.data.length > 0) {
    return { success: false, errMsg: `学号 ${sid} 已存在` };
  }
  await db.collection("students").add({ data: { sid: sid.trim(), name: name.trim() } });
  return { success: true, message: `已添加学生：${name}（${sid}）` };
}

// ========== 管理员：修改学生信息 ==========
async function updateStudent(id, sid, name) {
  if (!id) return { success: false, errMsg: "缺少学生 ID" };
  if (!sid || !name) return { success: false, errMsg: "学号和姓名不能为空" };

  // 检查新学号是否与其他学生冲突
  const exist = await db.collection("students").where({ sid }).get();
  if (exist.data.length > 0 && exist.data[0]._id !== id) {
    return { success: false, errMsg: `学号 ${sid} 已被其他学生使用` };
  }

  await db.collection("students").doc(id).update({
    data: { sid: sid.trim(), name: name.trim() },
  });
  return { success: true, message: "学生信息已更新" };
}

// ========== 管理员：删除学生 ==========
async function deleteStudent(id) {
  if (!id) return { success: false, errMsg: "缺少学生 ID" };

  // 获取学生信息用于确认
  const student = await db.collection("students").doc(id).get();
  if (!student.data) {
    return { success: false, errMsg: "学生不存在" };
  }

  // 删除学生记录（保留签到历史）
  await db.collection("students").doc(id).remove();
  return { success: true, message: `已删除学生：${student.data.name}（${student.data.sid}）` };
}

// ========== 云函数入口 ==========
exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (action) {
    case "checkIn":
      return await checkIn(openid, event.location);
    case "getMyRecords":
      return await getMyRecords(openid, event.page, event.pageSize);
    // ===== 管理员接口（账号密码登录后可用） =====
    case "getAllStudents":
      return await getAllStudents(event.keyword, event.page, event.pageSize, event.bindStatus);
    case "getAllRecords":
      return await getAllRecords({
        date: event.date,
        keyword: event.keyword,
        page: event.page,
        pageSize: event.pageSize,
      });
    case "batchImportStudents":
      return await batchImportStudents(event.csvText);
    case "addStudent":
      return await addStudent(event.sid, event.name);
    case "updateStudent":
      return await updateStudent(event.id, event.sid, event.name);
    case "deleteStudent":
      return await deleteStudent(event.id);
    case "exportRecords":
      return await exportRecords({ date: event.date, keyword: event.keyword });
    // ===== 公共接口 =====
    case "reverseGeocode":
      return await reverseGeocode(event.lat, event.lng);
    default:
      return { success: false, errMsg: `未知操作: ${action}` };
  }
};
