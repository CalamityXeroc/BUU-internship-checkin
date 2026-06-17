// pages/index/index.js
// 入口页：根据登录状态自动跳转
const app = getApp();

Page({
  data: {
    loading: true,
  },

  onLoad() {
    const role = wx.getStorageSync("userRole");

    if (role === "student") {
      this.verifyStudentAndGo();
    } else if (role === "admin") {
      wx.redirectTo({ url: "/pages/admin-dashboard/admin-dashboard" });
    } else {
      this.setData({ loading: false });
    }
  },

  async verifyStudentAndGo() {
    try {
      const api = require("../../utils/api");
      const res = await api.getStudentInfo();
      if (res.success) {
        app.globalData.studentInfo = res.student;
        wx.switchTab({ url: "/pages/home/home" });
      } else {
        app.logout();
        this.setData({ loading: false });
      }
    } catch (err) {
      this.setData({ loading: false });
    }
  },

  goStudent() {
    wx.navigateTo({ url: "/pages/login/login" });
  },

  goAdmin() {
    wx.navigateTo({ url: "/pages/admin-login/admin-login" });
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
});
