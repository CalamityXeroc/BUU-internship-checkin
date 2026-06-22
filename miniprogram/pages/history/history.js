// pages/history/history.js
const api = require("../../utils/api");

// 统一的日期解析器
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "object" && val.$date) return new Date(val.$date);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

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

  async loadRecords() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const res = await api.getMyRecords(this.data.page, this.data.pageSize);
      if (res.success) {
        // 提前处理日期，模板直接取值
        const formatted = res.records.map((r, i) => {
          const d = parseDate(r.signTime);
          return {
            ...r,
            _date: d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "--",
            _time: d ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "--:--",
            _weekday: d ? ["日", "一", "二", "三", "四", "五", "六"][d.getDay()] : "?",
          };
        });

        const records = this.data.page === 1
          ? formatted
          : [...this.data.records, ...formatted];

        this.setData({ records, total: res.total, hasMore: res.hasMore, loading: false });
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      this.setData({ loading: false });
    }
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 }, () => {
      this.loadRecords();
    });
  },

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
