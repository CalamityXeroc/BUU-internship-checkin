// pages/admin-dashboard/admin-dashboard.js
// 管理员仪表盘 - 学生列表，签到统计
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    adminInfo: null,
    students: [],
    totalStudents: 0,
    todaySignCount: 0,
    totalSignCount: 0,
    keyword: "",
    loading: false,
    headerPaddingTop: 40,
    capsuleHeight: 32,
  },

  onLoad() {
    // 获取胶囊按钮位置，避免自定义导航栏与胶囊重叠
    const sysInfo = wx.getSystemInfoSync();
    const menuBtn = wx.getMenuButtonBoundingClientRect();
    this.setData({
      headerPaddingTop: menuBtn.bottom + 8,
      capsuleHeight: menuBtn.height,
    });
  },

  onShow() {
    const adminInfo = app.globalData.adminInfo || wx.getStorageSync("adminInfo");
    if (!adminInfo) {
      wx.redirectTo({ url: "/pages/admin-login/admin-login" });
      return;
    }
    this.setData({ adminInfo });
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });

    try {
      const [studentRes, todayRes, allRes] = await Promise.all([
        api.getAllStudents(this.data.keyword),
        api.getAllRecords({ date: this.getTodayStr(), pageSize: 1000 }),
        api.getAllRecords({ pageSize: 1 }),
      ]);

      if (studentRes.success) {
        this.setData({
          students: studentRes.students,
          totalStudents: studentRes.students.length,
        });
      }

      if (todayRes.success) {
        this.setData({ todaySignCount: todayRes.total });
      }

      if (allRes.success) {
        this.setData({ totalSignCount: allRes.total });
      }
    } catch (err) {
      console.error("加载数据失败:", err);
    }

    this.setData({ loading: false });
  },

  getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  handleSearch() {
    this.loadData();
  },

  viewStudentRecords(e) {
    const sid = e.currentTarget.dataset.sid;
    const name = e.currentTarget.dataset.name;
    wx.navigateTo({
      url: `/pages/admin-records/admin-records?sid=${sid}&name=${name}`,
    });
  },

  goAllRecords() {
    wx.navigateTo({ url: "/pages/admin-records/admin-records" });
  },

  goSettings() {
    wx.navigateTo({ url: "/pages/admin-settings/admin-settings" });
  },

  handleLogout() {
    wx.showModal({
      title: "退出登录",
      content: "确定退出管理后台吗？",
      confirmColor: "#EF4444",
      success: (res) => {
        if (res.confirm) {
          app.logout();
          wx.redirectTo({ url: "/pages/index/index" });
        }
      },
    });
  },
});
