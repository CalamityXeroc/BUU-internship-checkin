# 北京联合大学实习签到系统

<p align="center">
  <img src="https://img.shields.io/badge/微信小程序-原生-green?logo=wechat" alt="WeChat Mini Program" />
  <img src="https://img.shields.io/badge/云开发-CloudBase-blue?logo=tencentcloud" alt="CloudBase" />
  <img src="https://img.shields.io/badge/数据库-云数据库-orange" alt="Database" />
  <img src="https://img.shields.io/badge/地图-高德API-red" alt="AMap" />
  <img src="https://img.shields.io/badge/license-MIT-brightgreen" alt="License" />
</p>

北京联合大学学生实习签到小程序源码，基于 **微信原生小程序 + 微信云开发** 构建。面向学生提供身份绑定与每日位置签到，面向教师提供签到数据管理与 CSV 导出。

## 功能概览

### 学生端

| 功能 | 说明 |
|---|---|
| 微信一键登录 | 首次登录校验学号 + 姓名，一人一号防代签 |
| 每日签到 | GPS 高精度定位 → 高德逆地理编码 → 存储街道地址 |
| 签到历史 | 时间线展示历次签到，支持上拉分页加载 |
| 退出登录 | 清除本地状态，重新进入需再次验证 |

### 教师端

| 功能 | 说明 |
|---|---|
| 账号密码登录 | 支持修改密码，含暴力破解保护（5次锁定15分钟） |
| 学生列表 | 分页展示，支持学号/姓名搜索 + 绑定状态筛选 |
| 签到记录查询 | 默认显示今日，支持学号/姓名/日期组合筛选 |
| 数据导出 | 筛选结果生成 CSV 并复制到剪贴板 |

## 安全特性

- 教师端 API 服务端鉴权（openid 校验，学生无法调用管理接口）
- 签到使用服务端时间 + 去重校验（无法重复签到）
- 定位未就绪时禁止签到（防止伪造位置）
- 管理员登录暴力破解保护（5 次失败锁定 15 分钟）
- 修改密码服务端校验调用者身份
- 云函数强制 Asia/Shanghai 时区（防止日期边界偏移）

## 技术栈

```
微信小程序原生（WXML + WXSS + JS）
     │
     ├── 云函数层（Node.js）   ← wx-server-sdk
     │    ├── userService      认证、绑定、管理员登录
     │    ├── signService      签到、逆地理编码、记录查询与导出
     │    └── initService      数据库集合初始化
     │
     ├── 数据库（云开发 MongoDB 兼容）
     │    ├── students          学生花名册
     │    ├── sign_records      签到记录
     │    └── admins            管理员账号
     │
     └── 三方服务
          └── 高德地图 Web 服务 API（逆地理编码）
```

## 项目结构

```
BUUsign/
├── cloudfunctions/
│   ├── userService/          # 用户认证服务（登录、绑定、管理员）
│   ├── signService/          # 签到服务（打卡、查询、逆地理编码、导出）
│   └── initService/          # 数据库初始化服务
├── miniprogram/
│   ├── pages/
│   │   ├── index/             # 入口页，角色选择与自动登录检测
│   │   ├── login/             # 学生端：微信登录 + 学号绑定
│   │   ├── home/              # 学生端：今日签到首页
│   │   ├── history/           # 学生端：签到记录时间线
│   │   ├── profile/           # 学生端：个人信息与退出
│   │   ├── admin-login/       # 教师端：账号密码登录
│   │   ├── admin-dashboard/   # 教师端：学生列表与统计
│   │   ├── admin-records/     # 教师端：签到记录查询与导出
│   │   └── admin-settings/    # 教师端：修改密码
│   ├── utils/
│   │   └── api.js             # 云函数调用封装
│   ├── app.js                 # 应用入口，云环境初始化
│   ├── app.json               # 页面路由、TabBar、权限声明
│   └── app.wxss               # 全局样式变量（蓝色主题）
└── project.config.json
```

## 快速开始

### 环境要求

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（基础库 ≥ 2.20）
- 已注册的微信小程序 AppID
- [高德开放平台](https://console.amap.com) Web 服务 API Key（用于逆地理编码）
- 微信公众平台已申请 `wx.getLocation` 接口权限

### 配置

**1. `miniprogram/app.js`** — 云开发环境 ID：

```javascript
env: "your-cloud-env-id",
```

**2. `cloudfunctions/signService/index.js`** — 高德 Web 服务 Key：

```javascript
const AMAP_KEY = "your-amap-web-service-key";
```

### 部署

1. 微信开发者工具打开项目
2. 工具栏点击「云开发」→ 开通云环境
3. 在左侧文件树右键 `cloudfunctions` →「当前云环境」→ 选择对应环境
4. 依次右键三个云函数目录 →「上传并部署：云端安装依赖」

### 数据库初始化

通过云开发控制台或 `initService` 云函数创建集合：

- `students` — 学生花名册（通过批量导入功能添加）
- `sign_records` — 签到记录（学生签到时自动生成）
- `admins` — 管理员账号（初始化时自动创建）

### 导入学生名单

通过 `signService` 的 `batchImportStudents` 接口批量导入 CSV 格式学生数据（需管理员身份）。

## 数据库模型

### students

| 字段 | 类型 | 说明 |
|---|---|---|
| `sid` | String | 学号，唯一标识 |
| `name` | String | 学生姓名 |
| `openid` | String | 微信 openid，绑定后写入 |
| `bindTime` | Date | 微信绑定时间 |

### sign_records

| 字段 | 类型 | 说明 |
|---|---|---|
| `sid` | String | 学号 |
| `name` | String | 姓名（冗余，便于查询） |
| `openid` | String | 签到者 openid |
| `location` | String | 签到地址（街道级） |
| `signTime` | Date | 签到时间（服务器时间） |

### admins

| 字段 | 类型 | 说明 |
|---|---|---|
| `account` | String | 管理员账号 |
| `password` | String | 密码（建议部署后立即修改） |
| `openid` | String | 管理员微信 openid（登录时自动绑定，用于接口鉴权） |

## 权限设计

| 角色 | 权限范围 |
|---|---|
| 学生 | 仅可查看本人签到记录，每日限签一次 |
| 教师 | 查看所有学生信息与签到记录，导出数据，管理学生名单 |

## License

MIT
