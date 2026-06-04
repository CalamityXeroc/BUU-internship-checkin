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

// ========== 管理员：获取所有学生列表 ==========
async function getAllStudents(keyword = "") {
  let query = db.collection("students");

  if (keyword) {
    query = query.where(
      _.or([
        { name: db.RegExp({ regexp: keyword, options: "i" }) },
        { sid: db.RegExp({ regexp: keyword, options: "i" }) },
      ])
    );
  }

  const res = await query.orderBy("sid", "asc").limit(200).get();

  return {
    success: true,
    students: res.data,
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
    case "getAllStudents":
      return await getAllStudents(event.keyword);
    case "getAllRecords":
      return await getAllRecords({
        date: event.date,
        keyword: event.keyword,
        page: event.page,
        pageSize: event.pageSize,
      });
    case "reverseGeocode":
      return await reverseGeocode(event.lat, event.lng);
    case "exportRecords":
      return await exportRecords({ date: event.date, keyword: event.keyword });
    default:
      return { success: false, errMsg: `未知操作: ${action}` };
  }
};
