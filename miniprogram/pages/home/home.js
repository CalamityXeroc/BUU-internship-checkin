// pages/home/home.js
// 学生首页 - 今日签到
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    studentInfo: null,
    todaySigned: false,
    todayRecord: null,
    currentDate: "",
    currentTime: "",
    location: "定位中...",
    signing: false,
    recentRecords: [],
  },

  onShow() {
    this.loadData();
  },

  onLoad() {
    this.updateTime();
    this.interval = setInterval(() => {
      this.updateTime();
    }, 60000);
  },

  onUnload() {
    if (this.interval) clearInterval(this.interval);
  },

  updateTime() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
    const weekDay = weekDays[now.getDay()];
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    this.setData({
      currentDate: `${dateStr} 星期${weekDay}`,
      currentTime: timeStr,
    });
  },

  async loadData() {
    const studentInfo = app.globalData.studentInfo || wx.getStorageSync("studentInfo");

    if (!studentInfo) {
      wx.redirectTo({ url: "/pages/index/index" });
      return;
    }

    this.setData({ studentInfo });

    // 获取定位
    this.getLocation();

    // 获取今日签到状态
    try {
      const res = await api.getMyRecords(1, 1);
      if (res.success && res.records.length > 0) {
        const latest = res.records[0];
        const today = new Date().toDateString();
        const recordDate = new Date(latest.signTime).toDateString();

        if (today === recordDate) {
          this.setData({
            todaySigned: true,
            todayRecord: latest,
          });
        }
      }
    } catch (err) {
      console.error("获取签到记录失败:", err);
    }

    // 获取最近记录
    try {
      const res = await api.getMyRecords(1, 5);
      if (res.success) {
        this.setData({ recentRecords: res.records });
      }
    } catch (err) {
      console.error("获取最近记录失败:", err);
    }
  },

  // 获取位置（GPS → 云函数逆地理编码 → 街道地址）
  async getLocation() {
    try {
      const locRes = await new Promise((resolve, reject) => {
        wx.getLocation({ type: "gcj02", success: resolve, fail: reject });
      });

      const { latitude, longitude } = locRes;
      const lat = latitude.toFixed(6);
      const lng = longitude.toFixed(6);

      // 调用云函数做逆地理编码
      const geoRes = await api.reverseGeocode(lat, lng);
      if (geoRes.success) {
        this.setData({
          location: geoRes.formatted || geoRes.address,
          latitude,
          longitude,
        });
      } else {
        // 云函数失败时用坐标作为兜底
        this.setData({
          location: `${lat}, ${lng}`,
          latitude,
          longitude,
        });
      }
    } catch (err) {
      this.setData({ location: "无法获取位置，请授权定位权限" });
    }
  },

  // 签到
  async handleSignIn() {
    if (this.data.todaySigned) {
      wx.showToast({ title: "今日已签到", icon: "none" });
      return;
    }

    this.setData({ signing: true });

    try {
      const res = await api.checkIn(this.data.location);

      if (res.success) {
        wx.showToast({ title: "签到成功！", icon: "success" });
        this.setData({
          todaySigned: true,
          todayRecord: res.record,
          signing: false,
        });
        // 刷新最近记录
        this.loadData();
      } else if (res.alreadySigned) {
        this.setData({
          todaySigned: true,
          todayRecord: res.record,
          signing: false,
        });
        wx.showToast({ title: "今日已签到", icon: "none" });
      } else {
        wx.showToast({ title: res.errMsg || "签到失败", icon: "none" });
        this.setData({ signing: false });
      }
    } catch (err) {
      wx.showToast({ title: "签到失败", icon: "none" });
      this.setData({ signing: false });
    }
  },

  // 跳转历史
  goHistory() {
    wx.switchTab({ url: "/pages/history/history" });
  },

  // 格式化时间
  formatTime(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  },
});
