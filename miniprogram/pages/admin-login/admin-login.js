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

  // 返回首页
  goHome() {
    wx.reLaunch({ url: "/pages/index/index" });
  },

  goBack() {
    wx.navigateBack();
  },
});
