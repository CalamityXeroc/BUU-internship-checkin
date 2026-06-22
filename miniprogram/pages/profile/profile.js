// pages/profile/profile.js
// 学生个人中心
const app = getApp();

Page({
  data: {
    studentInfo: null,
  },

  onShow() {
    const studentInfo = app.globalData.studentInfo || wx.getStorageSync("studentInfo");
    if (studentInfo) {
      this.setData({ studentInfo });
    }
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后需要重新验证身份，确定退出吗？",
      confirmColor: "#EF4444",
      success: (res) => {
        if (res.confirm) {
          app.logout();
          wx.reLaunch({ url: "/pages/index/index" });
        }
      },
    });
  },

  // 格式化绑定时间
  formatBindTime(time) {
    if (!time) return "未知";
    const d = new Date(time);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  },

  onShareAppMessage() {
    return { title: "北京联合大学实习签到", path: "/pages/index/index" };
  },

  onShareTimeline() {
    return { title: "北京联合大学实习签到 — 每日打卡" };
  },
});
