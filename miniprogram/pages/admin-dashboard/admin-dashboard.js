// pages/admin-dashboard/admin-dashboard.js
// 管理员仪表盘 - 学生列表，签到统计
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    adminInfo: null,
    students: [],
    page: 1,
    pageSize: 20,
    hasMore: false,
    totalStudents: 0,
    todaySignCount: 0,
    totalSignCount: 0,
    keyword: "",
    bindStatus: "",
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

    // 搜索时重置分页
    this.setData({ students: [], page: 1, hasMore: false });
    await this.loadStudents();

    try {
      const todayRes = await api.getAllRecords({ date: this.getTodayStr(), pageSize: 1000 });
      if (todayRes.success) {
        this.setData({
          todaySignCount: todayRes.total,
          totalSignCount: todayRes.total,
        });
      }
    } catch (err) {
      console.error("加载签到统计失败:", err);
    }

    this.setData({ loading: false });
  },

  async loadStudents() {
    try {
      const res = await api.getAllStudents(this.data.keyword, this.data.page, this.data.pageSize, this.data.bindStatus);
      if (res.success) {
        const allStudents = this.data.page === 1
          ? res.students
          : [...this.data.students, ...res.students];
        this.setData({
          students: allStudents,
          totalStudents: res.total,
          hasMore: res.hasMore,
        });
      }
    } catch (err) {
      console.error("加载学生列表失败:", err);
    }
  },

  loadMoreStudents() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 }, () => {
      this.loadStudents();
    });
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

  // 绑定状态筛选
  onBindFilter(e) {
    const status = e.currentTarget.dataset.status;
    // 点击当前已选中则取消筛选
    const newStatus = this.data.bindStatus === status ? "" : status;
    this.setData({ bindStatus: newStatus });
    this.loadData();
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
