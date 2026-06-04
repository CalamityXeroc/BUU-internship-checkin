// pages/login/login.js
// 学生微信登录 + 学号绑定
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    step: "login", // 'login' | 'bind'
    loading: false,
    sid: "",
    name: "",
    errorMsg: "",
  },

  onLoad() {
    // 如果已绑定，直接跳转首页
    const studentInfo = wx.getStorageSync("studentInfo");
    if (studentInfo && studentInfo.sid) {
      wx.switchTab({ url: "/pages/home/home" });
    }
  },

  // 微信一键登录
  async handleWechatLogin() {
    this.setData({ loading: true, errorMsg: "" });

    try {
      const res = await api.studentLogin();

      if (!res.success) {
        this.setData({ errorMsg: "登录失败，请重试", loading: false });
        return;
      }

      if (res.bound) {
        // 已绑定，直接进入
        app.saveStudentLogin(res.student);
        wx.showToast({ title: "登录成功", icon: "success", duration: 1500 });
        setTimeout(() => {
          wx.switchTab({ url: "/pages/home/home" });
        }, 1500);
      } else {
        // 未绑定，进入绑定页面
        this.setData({ step: "bind", loading: false });
      }
    } catch (err) {
      this.setData({ errorMsg: "网络错误，请重试", loading: false });
    }
  },

  // 输入学号
  onSidInput(e) {
    this.setData({ sid: e.detail.value, errorMsg: "" });
  },

  // 输入姓名
  onNameInput(e) {
    this.setData({ name: e.detail.value, errorMsg: "" });
  },

  // 验证并绑定
  async handleBind() {
    const { sid, name } = this.data;

    if (!sid.trim()) {
      this.setData({ errorMsg: "请输入学号" });
      return;
    }

    if (!name.trim()) {
      this.setData({ errorMsg: "请输入姓名" });
      return;
    }

    this.setData({ loading: true, errorMsg: "" });

    try {
      const res = await api.bindStudent(sid.trim(), name.trim());

      if (res.success) {
        app.saveStudentLogin(res.student);
        wx.showToast({ title: "绑定成功", icon: "success", duration: 1500 });
        setTimeout(() => {
          wx.switchTab({ url: "/pages/home/home" });
        }, 1500);
      } else {
        this.setData({ errorMsg: res.errMsg || "验证失败", loading: false });
      }
    } catch (err) {
      this.setData({ errorMsg: "网络错误，请重试", loading: false });
    }
  },

  // 返回登录页
  backToLogin() {
    this.setData({ step: "login", errorMsg: "" });
  },

  // 返回首页
  goHome() {
    wx.reLaunch({ url: "/pages/index/index" });
  },
});
