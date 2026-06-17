// pages/home/home.js
const api = require("../../utils/api");
const app = getApp();

// 位置缓存（模块级别，30 秒内不重复请求 GPS + 逆地理编码）
let _locationCache = null;
let _locationCacheTime = 0;
const LOCATION_CACHE_MS = 30000;

Page({
  data: {
    studentInfo: null,
    todaySigned: false,
    todayRecord: null,
    currentDate: "",
    currentTime: "",
    location: "定位中...",
    locationReady: false,
    signing: false,
    recentRecords: [],
  },

  onShow() {
    this.loadData();
  },

  onLoad() {
    this.updateTime();
    this.interval = setInterval(() => this.updateTime(), 60000);
  },

  onUnload() {
    if (this.interval) clearInterval(this.interval);
  },

  updateTime() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
    this.setData({
      currentDate: `${dateStr} 星期${weekDays[now.getDay()]}`,
      currentTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    });
  },

  async loadData() {
    const studentInfo = app.globalData.studentInfo || wx.getStorageSync("studentInfo");
    if (!studentInfo) {
      wx.redirectTo({ url: "/pages/index/index" });
      return;
    }
    this.setData({ studentInfo });

    // 优先用缓存位置，无缓存才 GPS + 逆地理编码
    this.getLocation();
    this.loadRecentRecords();
  },

  async loadRecentRecords() {
    try {
      const res = await api.getMyRecords(1, 5);
      if (!res.success || res.records.length === 0) return;

      const today = new Date().toDateString();
      const latest = res.records[0];

      if (today === new Date(latest.signTime).toDateString()) {
        this.setData({ todaySigned: true, todayRecord: latest });
      }
      this.setData({ recentRecords: res.records });
    } catch (err) {
      console.error("获取签到记录失败:", err);
    }
  },

  async getLocation() {
    // 30 秒内有缓存直接用，避免频繁调用 GPS + 逆地理编码
    const now = Date.now();
    if (_locationCache && now - _locationCacheTime < LOCATION_CACHE_MS) {
      this.setData({ location: _locationCache, locationReady: true });
      return;
    }

    try {
      const locRes = await new Promise((resolve, reject) => {
        wx.getLocation({
          type: "gcj02",
          isHighAccuracy: true,
          highAccuracyExpireTime: 10000,
          success: resolve,
          fail: reject,
        });
      });

      const lat = locRes.latitude.toFixed(6);
      const lng = locRes.longitude.toFixed(6);

      const geoRes = await api.reverseGeocode(lat, lng);
      const addr = geoRes.success ? (geoRes.formatted || geoRes.address) : `${lat}, ${lng}`;

      _locationCache = addr;
      _locationCacheTime = now;
      this.setData({ location: addr, locationReady: true, latitude: locRes.latitude, longitude: locRes.longitude });
    } catch (err) {
      this.setData({ location: "无法获取位置，请授权定位权限", locationReady: false });
    }
  },

  async handleSignIn() {
    if (this.data.todaySigned) {
      wx.showToast({ title: "今日已签到", icon: "none" });
      return;
    }
    // H1: 定位失败时禁止签到
    if (!this.data.locationReady) {
      wx.showToast({ title: "定位未就绪，请稍后重试", icon: "none" });
      this.getLocation(); // 尝试重新定位
      return;
    }
    // 防抖：signing 为 true 时禁止重复点击
    if (this.data.signing) return;

    this.setData({ signing: true });

    try {
      const res = await api.checkIn(this.data.location);

      if (res.success) {
        wx.showToast({ title: "签到成功！", icon: "success" });
        this.setData({ todaySigned: true, todayRecord: res.record, signing: false });
      } else if (res.alreadySigned) {
        wx.showToast({ title: "今日已签到", icon: "none" });
        this.setData({ todaySigned: true, todayRecord: res.record, signing: false });
      } else {
        wx.showToast({ title: res.errMsg || "签到失败", icon: "none" });
        this.setData({ signing: false });
      }
    } catch (err) {
      wx.showToast({ title: "签到失败", icon: "none" });
      this.setData({ signing: false });
    }
  },

  goHistory() {
    wx.switchTab({ url: "/pages/history/history" });
  },

  // 转发给好友
  onShareAppMessage() {
    return {
      title: "北京联合大学实习签到",
      path: "/pages/index/index",
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: "北京联合大学实习签到 — 每日打卡",
    };
  },

  formatTime(val) {
    if (!val) return "";
    let d;
    if (val instanceof Date) d = val;
    else if (typeof val === "object" && val.$date) d = new Date(val.$date);
    else d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  },
});
