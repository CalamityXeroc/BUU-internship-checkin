// pages/history/history.js
// 学生签到历史记录
const api = require("../../utils/api");

Page({
  data: {
    records: [],
    page: 1,
    pageSize: 20,
    hasMore: false,
    loading: false,
    total: 0,
  },

  onShow() {
    this.setData({ records: [], page: 1, hasMore: false });
    this.loadRecords();
  },

  // 加载记录
  async loadRecords() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const res = await api.getMyRecords(this.data.page, this.data.pageSize);
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

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${min}`,
      weekday: ["日", "一", "二", "三", "四", "五", "六"][d.getDay()],
    };
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ records: [], page: 1, hasMore: false }, () => {
      this.loadRecords().then(() => {
        wx.stopPullDownRefresh();
      });
    });
  },
});
