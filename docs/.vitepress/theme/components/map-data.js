/**
 * 校园地图数据
 * 坐标统一使用 GCJ02（高德坐标系），从高德拾取器获取：https://lbs.amap.com/tools/picker
 * 添加点位：在 BUILDINGS 数组追加 { id, name, category, campusId, coord: [经度, 纬度], desc }
 */

export const CATEGORY_CONFIG = {
  teaching:   { label: '教学楼',   color: '#015D95' },
  dormitory:  { label: '学生宿舍', color: '#2C8AC9' },
  canteen:    { label: '食堂',     color: '#5BA3D6' },
  library:    { label: '图书馆',   color: '#01416B' },
  sports:     { label: '运动场馆', color: '#9BC4E2' },
  admin:      { label: '行政楼',   color: '#015D95' },
  gate:       { label: '校门',     color: '#2C8AC9' },
  hospital:   { label: '校医院',   color: '#5BA3D6' },
  theater:    { label: '剧场',     color: '#0E6FA8' },
  busstation: { label: '校车站',   color: '#5A82B8' },
  landmark:   { label: '地标建筑', color: '#015D95' },
  college:    { label: '学院楼',   color: '#0E6FA8' },
  food:       { label: '附近美食', color: '#7BA8E0' },
  express:    { label: '快递点',   color: '#4A7CC0' },
  transit:    { label: '轨道交通', color: '#3B6BA5' }
}

/* 分类 SVG 图标 path 数据（Lucide 风格，抄自 CQU-openlib markerIcons.ts） */
export const CATEGORY_ICON_PATHS = {
  teaching:
    '<path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M18 5v16"/><path d="m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6"/><path d="m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11"/><path d="M6 5v16"/><circle cx="12" cy="9" r="2"/>',
  dormitory:
    '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/>',
  canteen:
    '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  library:
    '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  sports:
    '<path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/><path d="m2.5 21.5 1.4-1.4"/><path d="m20.1 3.9 1.4-1.4"/><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/><path d="m9.6 14.4 4.8-4.8"/>',
  admin:
    '<path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>',
  gate: '<path d="M11 20H2"/><path d="M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z"/><path d="M11 4H8a2 2 0 0 0-2 2v14"/><path d="M14 12h.01"/><path d="M22 20h-3"/>',
  hospital:
    '<path d="M12 7v4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M14 9h-4"/><path d="M18 11h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 21V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16"/>',
  theater:
    '<path d="M10 11h.01"/><path d="M14 6h.01"/><path d="M18 6h.01"/><path d="M6.5 13.1h.01"/><path d="M22 5c0 9-4 12-6 12s-6-3-6-12c0-2 2-3 6-3s6 1 6 3"/><path d="M17.4 9.9c-.8.8-2 .8-2.8 0"/><path d="M10.1 7.1C9 7.2 7.7 7.7 6 8.6c-3.5 2-4.7 3.9-3.7 5.6 4.5 7.8 9.5 8.4 11.2 7.4.9-.5 1.9-2.1 1.9-4.7"/><path d="M9.1 16.5c.3-1.1 1.4-1.7 2.4-1.4"/>',
  busstation:
    '<path d="M4 6 2 7"/><path d="M10 6h4"/><path d="m22 7-2-1"/><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 19v2"/><path d="M18 21v-2"/>',
  transit:
    '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/>',
  landmark:
    '<path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
  college:
    '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  food: '<path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M7 21h10"/><path d="M19.5 12 22 6"/><path d="M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62"/><path d="M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62"/><path d="M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62"/>',
  express:
    '<path d="M12 22v-9"/><path d="M15.17 2.21a1.67 1.67 0 0 1 1.63 0L21 4.57a1.93 1.93 0 0 1 0 3.36L8.82 14.79a1.655 1.655 0 0 1-1.64 0L3 12.43a1.93 1.93 0 0 1 0-3.36z"/><path d="M20 13v3.87a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13"/><path d="M21 12.43a1.93 1.93 0 0 0 0-3.36L8.83 2.2a1.64 1.64 0 0 0-1.63 0L3 4.57a1.93 1.93 0 0 0 0 3.36l12.18 6.86a1.636 1.636 0 0 0 1.63 0z"/>'
}

export const CAMPUS_CONFIG = {
  h: { name: 'xx校区', coord: [], zoom: 16 },
  s: { name: 'xx校区', coord: [], zoom: 16 },
  l: { name: 'xx校区', coord: [], zoom: 16 }
}

export const FILTER_LIST = [
  { key: 'all',        label: '全部',     icon: 'fa-th-large' },
  { key: 'teaching',   label: '教学楼',   icon: 'fa-graduation-cap' },
  { key: 'dormitory',  label: '学生宿舍', icon: 'fa-building' },
  { key: 'canteen',    label: '食堂',     icon: 'fa-cutlery' },
  { key: 'library',    label: '图书馆',   icon: 'fa-book' },
  { key: 'sports',     label: '运动场馆', icon: 'fa-futbol-o' },
  { key: 'admin',      label: '行政楼',   icon: 'fa-briefcase' },
  { key: 'gate',       label: '校门',     icon: 'fa-flag' },
  { key: 'hospital',   label: '校医院',   icon: 'fa-hospital-o' },
  { key: 'theater',    label: '剧场',     icon: 'fa-ticket' },
  { key: 'busstation', label: '校车站',   icon: 'fa-bus' },
  { key: 'landmark',   label: '地标建筑', icon: 'fa-star' },
  { key: 'college',    label: '学院楼',   icon: 'fa-university' },
  { key: 'food',       label: '附近美食', icon: 'fa-coffee' },
  { key: 'express',    label: '快递点',   icon: 'fa-archive' },
  { key: 'transit',    label: '轨道交通', icon: 'fa-train' }
]

export const BUILDINGS = [
  {
    id: '建筑唯一id',
    name: '建筑名称',
    category: '建筑分类',
    campusId: '校区代号',
    coord: [xxx,xxx],
    desc: '此处为建筑描述'
  },
]
