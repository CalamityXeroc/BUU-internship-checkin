// pages/admin-settings/admin-settings.js
// 管理员设置 - 修改密码
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    loading: false,
    errorMsg: "",
    successMsg: "",
  },

  onOldPwdInput(e) {
    this.setData({ oldPassword: e.detail.value, errorMsg: "", successMsg: "" });
  },

  onNewPwdInput(e) {
    this.setData({ newPassword: e.detail.value, errorMsg: "", successMsg: "" });
  },

  onConfirmPwdInput(e) {
    this.setData({ confirmPassword: e.detail.value, errorMsg: "", successMsg: "" });
  },

  async handleChangePassword() {
    const { oldPassword, newPassword, confirmPassword } = this.data;

    if (!oldPassword) {
      this.setData({ errorMsg: "请输入原密码" });
      return;
    }
    if (!newPassword) {
      this.setData({ errorMsg: "请输入新密码" });
      return;
    }
    if (newPassword.length < 4) {
      this.setData({ errorMsg: "新密码长度不能少于4位" });
      return;
    }
    if (newPassword !== confirmPassword) {
      this.setData({ errorMsg: "两次输入的密码不一致" });
      return;
    }

    const adminInfo = app.globalData.adminInfo || wx.getStorageSync("adminInfo");
    if (!adminInfo) {
      wx.redirectTo({ url: "/pages/admin-login/admin-login" });
      return;
    }

    this.setData({ loading: true, errorMsg: "", successMsg: "" });

    try {
      const res = await api.changeAdminPassword(adminInfo.account, oldPassword, newPassword);

      if (res.success) {
        this.setData({
          loading: false,
          successMsg: "密码修改成功",
          oldPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        wx.showToast({ title: "密码修改成功", icon: "success" });
      } else {
        this.setData({ errorMsg: res.errMsg || "修改失败", loading: false });
      }
    } catch (err) {
      this.setData({ errorMsg: "网络错误，请重试", loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },
});
