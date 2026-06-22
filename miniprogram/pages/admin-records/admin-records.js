// pages/admin-records/admin-records.js
// 管理员 - 签到记录查看（支持筛选和导出）
const api = require("../../utils/api");

Page({
  data: {
    records: [],
    page: 1,
    pageSize: 20,
    hasMore: false,
    loading: false,
    total: 0,
    filterKeyword: "",
    filterDate: "",
    filterName: "",
    showFilter: false,
    exporting: false,
  },

  onLoad(options) {
    const { sid, name } = options;
    // 默认只看今日签到记录
    const today = this.getTodayStr();
    if (sid) {
      this.setData({ filterKeyword: sid, filterName: name || "", filterDate: today });
    } else {
      this.setData({ filterDate: today });
    }
    this.loadRecords();
  },

  getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  },

  // 加载记录
  async loadRecords() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const params = {
        page: this.data.page,
        pageSize: this.data.pageSize,
      };
      if (this.data.filterKeyword) params.keyword = this.data.filterKeyword;
      if (this.data.filterDate) params.date = this.data.filterDate;

      const res = await api.getAllRecords(params);

      if (res.success) {
        const records = this.data.page === 1
          ? res.records
          : [...this.data.records, ...res.records];

        this.setData({
          records,
          total: res.total,
          hasMore: res.hasMore,
          loading: false,
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      this.setData({ loading: false });
    }
  },

  // 加载更多
  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 }, () => {
      this.loadRecords();
    });
  },

  // 切换筛选面板
  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  // 日期筛选
  onDateChange(e) {
    this.setData({ filterDate: e.detail.value });
  },

  // 学号/姓名筛选
  onKeywordInput(e) {
    this.setData({ filterKeyword: e.detail.value });
  },

  // 应用筛选
  applyFilter() {
    this.setData({ showFilter: false, records: [], page: 1, hasMore: false });
    this.loadRecords();
  },

  // 清除筛选（回到今日默认）
  clearFilter() {
    this.setData({
      filterKeyword: "",
      filterDate: this.getTodayStr(),
      filterName: "",
      showFilter: false,
      records: [],
      page: 1,
      hasMore: false,
    });
    this.loadRecords();
  },

  // 导出签到数据
  async handleExport() {
    this.setData({ exporting: true });

    try {
      const params = {};
      if (this.data.filterKeyword) params.keyword = this.data.filterKeyword;
      if (this.data.filterDate) params.date = this.data.filterDate;

      const res = await api.exportRecords(params);

      if (!res.success || res.records.length === 0) {
        wx.showToast({ title: "没有可导出的数据", icon: "none" });
        this.setData({ exporting: false });
        return;
      }

      // 生成 CSV
      const BOM = "﻿"; // UTF-8 BOM，Excel 能正确识别中文
      const headers = ["学号", "姓名", "签到位置", "签到时间"];
      const rows = res.records.map((r) => {
        const raw = r.signTime;
        const time = raw instanceof Date ? raw : (raw && raw.$date ? new Date(raw.$date) : new Date(raw));
        const timeStr = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, "0")}-${String(time.getDate()).padStart(2, "0")} ${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}:${String(time.getSeconds()).padStart(2, "0")}`;
        return [r.sid, r.name, r.location, timeStr];
      });

      const csvContent = BOM + [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      // 方案1：直接复制到剪贴板，粘贴到 Excel
      wx.setClipboardData({
        data: csvContent,
        success: () => {
          wx.showModal({
            title: "导出成功",
            content: `共 ${res.records.length} 条签到记录已复制到剪贴板。\n\n打开 Excel → 新建 → 粘贴（Ctrl+V）→ 点击"数据"选项卡 →"分列"→ 选择"逗号分隔"即可。`,
            showCancel: false,
            confirmText: "知道了",
          });
        },
        fail: () => {
          wx.showToast({ title: "复制失败，请重试", icon: "none" });
        },
      });
    } catch (err) {
      wx.showToast({ title: "导出失败", icon: "none" });
    }

    this.setData({ exporting: false });
  },

  // 格式化时间
  formatTime(val) {
    if (!val) return "";
    let d;
    if (val instanceof Date) {
      d = val;
    } else if (typeof val === "object" && val.$date) {
      d = new Date(val.$date);
    } else {
      d = new Date(val);
    }
    if (isNaN(d.getTime())) return "";
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ records: [], page: 1, hasMore: false }, () => {
      this.loadRecords().then(() => {
        wx.stopPullDownRefresh();
      });
    });
  },

  onShareAppMessage() {
    return { title: "北京联合大学实习签到", path: "/pages/index/index" };
  },

  onShareTimeline() {
    return { title: "北京联合大学实习签到 — 每日打卡" };
  },
});
