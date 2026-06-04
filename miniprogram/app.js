// app.js
App({
  onLaunch() {
    this.globalData = {
      env: "YOUR_CLOUD_ENV_ID",
      userRole: "", // 'student' | 'admin'
      studentInfo: null,
      adminInfo: null,
    };

    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }

    // Restore login state from storage
    const role = wx.getStorageSync("userRole");
    if (role) {
      this.globalData.userRole = role;
      if (role === "student") {
        this.globalData.studentInfo = wx.getStorageSync("studentInfo") || null;
      } else if (role === "admin") {
        this.globalData.adminInfo = wx.getStorageSync("adminInfo") || null;
      }
    }
  },

  // Save login state
  saveStudentLogin(info) {
    this.globalData.userRole = "student";
    this.globalData.studentInfo = info;
    wx.setStorageSync("userRole", "student");
    wx.setStorageSync("studentInfo", info);
  },

  saveAdminLogin(info) {
    this.globalData.userRole = "admin";
    this.globalData.adminInfo = info;
    wx.setStorageSync("userRole", "admin");
    wx.setStorageSync("adminInfo", info);
  },

  // Clear login state
  logout() {
    this.globalData.userRole = "";
    this.globalData.studentInfo = null;
    this.globalData.adminInfo = null;
    wx.removeStorageSync("userRole");
    wx.removeStorageSync("studentInfo");
    wx.removeStorageSync("adminInfo");
  },

  globalData: {
    env: "YOUR_CLOUD_ENV_ID",
    userRole: "",
    studentInfo: null,
    adminInfo: null,
  },
});
