// pages/admin-login/admin-login.js
// 管理员登录
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    account: "",
    password: "",
    loading: false,
    errorMsg: "",
  },

  onAccountInput(e) {
    this.setData({ account: e.detail.value, errorMsg: "" });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value, errorMsg: "" });
  },

  async handleLogin() {
    const { account, password } = this.data;

    if (!account.trim()) {
      this.setData({ errorMsg: "请输入账号" });
      return;
    }
    if (!password.trim()) {
      this.setData({ errorMsg: "请输入密码" });
      return;
    }

    this.setData({ loading: true, errorMsg: "" });

    try {
      const res = await api.adminLogin(account.trim(), password.trim());

      if (res.success) {
        app.saveAdminLogin(res.admin);
        wx.showToast({ title: "登录成功", icon: "success", duration: 1200 });
        setTimeout(() => {
          wx.redirectTo({ url: "/pages/admin-dashboard/admin-dashboard" });
        }, 1200);
      } else {
        this.setData({ errorMsg: res.errMsg || "登录失败", loading: false });
      }
    } catch (err) {
      this.setData({ errorMsg: "网络错误，请重试", loading: false });
    }
  },

  // 初始化数据库
  async handleInit() {
    wx.showModal({
      title: "初始化数据库",
      content: "将创建数据库集合并导入默认数据（管理员 admin/123456 + 示例学生）。",
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: "初始化中..." });
          try {
            const result = await api.initDatabase();
            wx.hideLoading();
            if (result.success) {
              wx.showModal({
                title: "初始化成功",
                content: `学生: ${result.details.students} 条\n签到: ${result.details.signRecords} 条\n管理员: ${result.details.admins} 条\n\n现在可以用 admin / 123456 登录了`,
                showCancel: false,
              });
            } else {
              wx.showToast({ title: result.errMsg || "初始化失败", icon: "none" });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: "初始化失败，请重试", icon: "none" });
          }
        }
      },
    });
  },

  // 返回首页
  goHome() {
    wx.reLaunch({ url: "/pages/index/index" });
  },

  goBack() {
    wx.navigateBack();
  },
});
