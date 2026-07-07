// pages/admin-dashboard/admin-dashboard.js
// 管理员仪表盘 - 学生列表（增删改查）+ 签到统计
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
    // 多选删除
    multiSelect: false,
    selectedIds: [],
    // 表单状态
    showForm: false,
    formMode: "", // 'add' | 'edit'
    formSid: "",
    formName: "",
    editingId: "",
  },

  onLoad() {
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
    this.setData({ loading: true, students: [], page: 1, hasMore: false });
    await this.loadStudents();

    try {
      const todayRes = await api.getAllRecords({ date: this.getTodayStr(), pageSize: 1000 });
      if (todayRes.success) {
        this.setData({ todaySignCount: todayRes.total, totalSignCount: todayRes.total });
      }
    } catch (err) {}

    this.setData({ loading: false });
  },

  async loadStudents() {
    try {
      const res = await api.getAllStudents(this.data.keyword, this.data.page, this.data.pageSize, this.data.bindStatus);
      if (res.success) {
        const allStudents = this.data.page === 1 ? res.students : [...this.data.students, ...res.students];
        this.setData({ students: allStudents, totalStudents: res.total, hasMore: res.hasMore });
      }
    } catch (err) {}
  },

  loadMoreStudents() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 }, () => this.loadStudents());
  },

  getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  },

  onSearchInput(e) { this.setData({ keyword: e.detail.value }); },
  handleSearch() { this.loadData(); },

  onBindFilter(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ bindStatus: this.data.bindStatus === status ? "" : status });
    this.loadData();
  },

  // ========== 学生操作菜单 ==========
  onStudentTap(e) {
    const { sid, name, id } = e.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ["查看签到记录", "编辑信息", "删除学生"],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.navigateTo({ url: `/pages/admin-records/admin-records?sid=${sid}&name=${name}` });
        } else if (res.tapIndex === 1) {
          this.showEditForm(id, sid, name);
        } else if (res.tapIndex === 2) {
          this.confirmDelete(id, name, sid);
        }
      },
    });
  },

  // ========== 添加学生 ==========
  showAddForm() {
    this.setData({ showForm: true, formMode: "add", formSid: "", formName: "", editingId: "" });
  },

  // ========== 编辑学生 ==========
  showEditForm(id, sid, name) {
    this.setData({ showForm: true, formMode: "edit", formSid: sid, formName: name, editingId: id });
  },

  hideForm() {
    this.setData({ showForm: false, formMode: "", formSid: "", formName: "", editingId: "" });
  },

  onFormSidInput(e) { this.setData({ formSid: e.detail.value }); },
  onFormNameInput(e) { this.setData({ formName: e.detail.value }); },

  async submitForm() {
    const { formMode, formSid, formName, editingId } = this.data;

    if (!formSid.trim() || !formName.trim()) {
      wx.showToast({ title: "学号和姓名不能为空", icon: "none" });
      return;
    }

    wx.showLoading({ title: formMode === "add" ? "添加中..." : "更新中..." });

    try {
      let res;
      if (formMode === "add") {
        res = await api.addStudent(formSid.trim(), formName.trim());
      } else {
        res = await api.updateStudent(editingId, formSid.trim(), formName.trim());
      }

      wx.hideLoading();
      if (res.success) {
        wx.showToast({ title: res.message, icon: "success" });
        this.hideForm();
        this.loadData();
      } else {
        wx.showToast({ title: res.errMsg, icon: "none" });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: "操作失败", icon: "none" });
    }
  },

  // ========== 删除学生 ==========
  confirmDelete(id, name, sid) {
    wx.showModal({
      title: "确认删除",
      content: `确定删除 ${name}（${sid}）吗？删除后该学生无法签到，历史签到记录将保留。`,
      confirmColor: "#FF4D4F",
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: "删除中..." });
          try {
            const result = await api.deleteStudent(id);
            wx.hideLoading();
            if (result.success) {
              wx.showToast({ title: "已删除", icon: "success" });
              this.loadData();
            } else {
              wx.showToast({ title: result.errMsg, icon: "none" });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: "删除失败", icon: "none" });
          }
        }
      },
    });
  },

  // ========== Excel 导入 ==========
  handleImportExcel() {
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      extension: ["xlsx", "xls"],
      success: async (res) => {
        const filePath = res.tempFiles[0].path;
        wx.showLoading({ title: "导入中..." });

        try {
          const fs = wx.getFileSystemManager();
          const base64 = fs.readFileSync(filePath, "base64");
          const result = await api.importExcel(base64);
          wx.hideLoading();

          if (result.success) {
            wx.showModal({
              title: "导入完成",
              content: `新增 ${result.imported} 人\n已存在跳过 ${result.skipped} 人`,
              showCancel: false,
            });
            this.loadData();
          } else {
            wx.showToast({ title: result.errMsg || "导入失败", icon: "none" });
          }
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: "导入失败", icon: "none" });
        }
      },
    });
  },

  // ========== 批量删除 ==========
  toggleMultiSelect() {
    if (this.data.multiSelect) {
      this.setData({ multiSelect: false, selectedIds: [] });
    } else {
      // 进入多选模式，给每个学生加 _checked 标记
      const students = this.data.students.map(s => {
        s._checked = false;
        return s;
      });
      this.setData({ multiSelect: true, students, selectedIds: [] });
    }
  },

  onStudentCheck(e) {
    const idx = e.currentTarget.dataset.index;
    const checked = !this.data.students[idx]._checked;
    this.setData({
      [`students[${idx}]._checked`]: checked,
      selectedIds: checked
        ? [...this.data.selectedIds, this.data.students[idx]._id]
        : this.data.selectedIds.filter(id => id !== this.data.students[idx]._id),
    });
  },

  selectAll() {
    if (this.data.selectedIds.length === this.data.students.length) {
      const students = this.data.students.map(s => { s._checked = false; return s; });
      this.setData({ students, selectedIds: [] });
    } else {
      const students = this.data.students.map(s => { s._checked = true; return s; });
      this.setData({ students, selectedIds: students.map(s => s._id) });
    }
  },

  async deleteSelected() {
    if (this.data.selectedIds.length === 0) {
      wx.showToast({ title: "请先选择学生", icon: "none" });
      return;
    }

    wx.showModal({
      title: "批量删除",
      content: `确定删除选中的 ${this.data.selectedIds.length} 名学生吗？`,
      confirmColor: "#FF4D4F",
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: "删除中..." });
          try {
            const result = await api.batchDeleteStudents(this.data.selectedIds);
            wx.hideLoading();
            wx.showToast({ title: result.message, icon: "success" });
            this.setData({ multiSelect: false, selectedIds: [] });
            this.loadData();
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: "删除失败", icon: "none" });
          }
        }
      },
    });
  },

  goAllRecords() { wx.navigateTo({ url: "/pages/admin-records/admin-records" }); },
  goSettings() { wx.navigateTo({ url: "/pages/admin-settings/admin-settings" }); },

  handleLogout() {
    wx.showModal({
      title: "退出登录",
      content: "确定退出管理后台吗？",
      confirmColor: "#FF4D4F",
      success: (res) => {
        if (res.confirm) {
          app.logout();
          wx.redirectTo({ url: "/pages/index/index" });
        }
      },
    });
  },

  onShareAppMessage() {
    return { title: "北京联合大学实习签到", path: "/pages/index/index" };
  },

  onShareTimeline() {
    return { title: "北京联合大学实习签到 — 每日打卡" };
  },
});
