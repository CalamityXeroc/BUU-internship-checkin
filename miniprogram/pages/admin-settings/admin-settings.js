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

  // 初始化数据库
  async handleInit() {
    wx.showModal({
      title: "初始化数据库",
      content: "将创建数据库集合并导入默认数据（管理员账号、示例学生）。确定继续吗？",
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: "初始化中..." });
          try {
            const result = await api.initDatabase();
            wx.hideLoading();
            if (result.success) {
              wx.showModal({
                title: "初始化成功",
                content: `学生: ${result.details.students} 条\n签到记录: ${result.details.signRecords} 条\n管理员: ${result.details.admins} 条`,
                showCancel: false,
              });
            } else {
              wx.showToast({ title: result.errMsg || "初始化失败", icon: "none" });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: "网络错误", icon: "none" });
          }
        }
      },
    });
  },

  async handleMockBind() {
    wx.showModal({
      title: "模拟绑定",
      content: "将为所有未绑定学生生成模拟 openid，模拟微信绑定过程。确定吗？",
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: "绑定中..." });
          try {
            const result = await api.mockBind();
            wx.hideLoading();
            wx.showModal({ title: "模拟绑定完成", content: result.message, showCancel: false });
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: "操作失败", icon: "none" });
          }
        }
      },
    });
  },

  async handleMockSign() {
    wx.showModal({
      title: "模拟签到",
      content: "将为所有已绑定学生生成今日签到记录。确定吗？",
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: "签到中..." });
          try {
            const result = await api.mockSign();
            wx.hideLoading();
            wx.showModal({ title: "模拟签到完成", content: result.message, showCancel: false });
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: "操作失败", icon: "none" });
          }
        }
      },
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
