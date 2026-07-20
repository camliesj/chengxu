export const companies = [
  { id: 'tongda', shortName: '通达汽车服务中心', fullName: '鄂尔多斯市通达汽车服务有限公司' },
  { id: 'xinqiheng', shortName: '鑫齐恒汽车服务中心', fullName: '鄂尔多斯市鑫齐恒汽车服务有限公司' },
];

export const sampleOrder = {
  orderNo: 'RO202607150018',
  plate: '蒙K·A3816',
  customer: '张先生',
  phone: '13812347216',
  model: '丰田 凯美瑞',
  vin: 'LVGBM51K8NG062816',
  insurer: '人保财险',
  expiryDate: '2026-12-28',
  claimNo: 'PIC20260715018',
  vehicleType: '轿车',
  accidentType: '钣喷维修（有换件）',
  repairContent: '右前翼子板钣金喷漆，更换右前大灯',
  laborFee: 680,
  materialFee: 2360,
  total: 3040,
  paymentMethod: '保险转账',
  staff: '张工',
  entryDate: '2026-07-15',
  entryTime: '08:12',
};

export const insurers = ['人保财险', '平安保险', '太平洋保险', '中华联合'];

export const staff = ['张工', '王工', '陈工', '李顾问'];

export const accidentTypes = [
  '喷漆维修（无换件）',
  '钣喷维修（有换件）',
  '机电维修保养',
  '数据修复',
];

export const vehicleTypes = ['轿车', 'SUV', 'MPV', '新能源'];

export const paymentMethods = ['保险转账', '客户自付', '对公结算'];

export const workbenchStateBand = [
  { label: '新建', value: '06', cue: '查看待接单' },
  { label: '在修', value: '18', cue: '进入维修看板' },
  { label: '待结算', value: '05', cue: '核对费用' },
  { label: '保险到期', value: '09', cue: '联系车主' },
];

export const employeeWorkbenchMetrics = [
  { label: '今日接车', value: '12', detail: '较昨日 +2', tone: 'primary' },
  { label: '在修车辆', value: '18', detail: '钣喷 7 / 机修 11', tone: 'success' },
  { label: '待交付', value: '04', detail: '今日需回访 2 台', tone: 'warning' },
  { label: '保险到期', value: '09', detail: '三日内到期', tone: 'danger' },
];

export const employeeRoleSummary = [
  { label: '当班接车', value: '7', detail: '上午 4 / 下午 3' },
  { label: '待回访', value: '2', detail: '均为今日交付车辆' },
  { label: '现场协同', value: '3 项', detail: '喷漆复检 1 / 备件确认 2' },
];

export const adminWorkbenchMetrics = [
  { label: '本月产值', value: '286,400', detail: '较上月 +8.6%', tone: 'primary' },
  { label: '待结算金额', value: '42,600', detail: '5 单待处理', tone: 'warning' },
  { label: '在修车辆', value: '18', detail: '负荷平稳', tone: 'success' },
  { label: '保险到期', value: '09', detail: '高优先跟进', tone: 'danger' },
];

export const employeeQuickActions = [
  { label: '接车登记', icon: 'add', targetTab: 'add' },
  { label: '维修推进', icon: 'tools', targetTab: 'orders' },
  { label: '保险提醒', icon: 'shield', targetTab: 'records' },
];

export const adminQuickActions = [
  { label: '办理结算', icon: 'wallet', targetTab: 'orders' },
  { label: '经营复盘', icon: 'records', targetTab: 'records' },
  { label: '保险提醒', icon: 'shield', targetTab: 'records' },
];

export const employeeWorkbenchOrders = [
  {
    orderNo: 'RO202607150021',
    plate: '蒙K·Q7285',
    customer: '李女士',
    phone: '139****1182',
    statusLabel: '在修',
    statusTone: 'success',
    repairSummary: '左后门钣金整形，等待喷漆复检',
    amountLabel: '预估 2,860',
    updatedAt: '09:20 更新',
  },
  {
    orderNo: 'RO202607150018',
    plate: '蒙K·A3816',
    customer: '张先生',
    phone: '138****7216',
    statusLabel: '待结算',
    statusTone: 'warning',
    repairSummary: '费用已确认，等待管理员完成结算',
    amountLabel: '合计 3,040',
    updatedAt: '08:45 更新',
  },
  {
    orderNo: 'RO202607150011',
    plate: '蒙K·M5639',
    customer: '王先生',
    phone: '136****3371',
    statusLabel: '保险到期',
    statusTone: 'danger',
    repairSummary: '商业险三日后到期，需提醒续保',
    amountLabel: '回访 1 次',
    updatedAt: '昨天 17:30',
  },
];

export const adminWorkbenchOrders = [
  {
    orderNo: 'RO202607150018',
    plate: '蒙K·A3816',
    customer: '张先生',
    phone: '138****7216',
    statusLabel: '待结算',
    statusTone: 'warning',
    repairSummary: '材料与工时已复核，可进入办理结算',
    amountLabel: '合计 3,040',
    updatedAt: '08:45 更新',
    actionLabel: '办理结算',
  },
  {
    orderNo: 'RO202607150021',
    plate: '蒙K·Q7285',
    customer: '李女士',
    phone: '139****1182',
    statusLabel: '在修',
    statusTone: 'success',
    repairSummary: '钣喷进度正常，预计 16:30 完工',
    amountLabel: '预估 2,860',
    updatedAt: '09:20 更新',
  },
  {
    orderNo: 'RO202607150007',
    plate: '蒙K·B2207',
    customer: '赵先生',
    phone: '137****2890',
    statusLabel: '保险到期',
    statusTone: 'danger',
    repairSummary: '续保沟通未完成，影响复购转化',
    amountLabel: '待跟进',
    updatedAt: '昨天 16:10',
  },
];

export const adminRoleSummary = [
  { label: '本月产值', value: '286,400', detail: '目标完成率 74%' },
  { label: '已结算工单', value: '61', detail: '平均到账 2.4 天' },
  { label: '返修率', value: '1.8%', detail: '较上月下降 0.4%' },
];

export const orderTabs = [
  { id: 'all', label: '全部' },
  { id: 'repairing', label: '在修' },
  { id: 'completed', label: '完工' },
  { id: 'awaiting-settlement', label: '待结算' },
];

export const currentOrders = [
  {
    orderNo: 'RO202607150018',
    plate: '蒙A3816',
    customer: '张先生',
    phone: '138****7216',
    statusLabel: '待结算',
    statusTone: 'warning',
    repairSummary: '右前翼子板钣金喷漆，更换右前大灯总成',
    amountLabel: '合计 3,040',
    updatedAt: '08:45 更新',
    model: '丰田 凯美瑞',
    staff: '张工',
    insurer: '人保财险',
  },
  {
    orderNo: 'RO202607150021',
    plate: '蒙Q7285',
    customer: '李女士',
    phone: '139****1182',
    statusLabel: '在修',
    statusTone: 'success',
    repairSummary: '左后门钣金整形，等待喷漆复检',
    amountLabel: '预估 2,860',
    updatedAt: '09:20 更新',
    model: '大众 途观 L',
    staff: '王工',
    insurer: '平安保险',
  },
  {
    orderNo: 'RO202607150024',
    plate: '蒙B2207',
    customer: '赵先生',
    phone: '137****2890',
    statusLabel: '完工',
    statusTone: 'primary',
    repairSummary: '前保险杠补漆完成，待客户确认提车',
    amountLabel: '合计 1,760',
    updatedAt: '10:05 更新',
    model: '本田 CR-V',
    staff: '陈工',
    insurer: '太平洋保险',
  },
];

export const filterGroups = [
  {
    title: '员工',
    options: ['全部', '张工', '王工', '陈工'],
  },
  {
    title: '保险公司',
    options: ['全部', '人保财险', '平安保险', '太平洋保险'],
  },
  {
    title: '日期',
    options: ['今天', '近 3 天', '近 7 天'],
  },
  {
    title: '车辆类型',
    options: ['全部', '轿车', 'SUV', '新能源'],
  },
  {
    title: '状态',
    options: ['全部', '在修', '完工', '待结算'],
  },
];

export const detailTimeline = [
  { title: '已接车', time: '07-15 08:12', detail: '接待顾问录入工单并拍照验车', done: true },
  { title: '在修', time: '07-15 09:00', detail: '钣喷工位施工中，等待终检', done: true },
  { title: '完工', time: '待确认', detail: '确认修复质量后可切换为完工', done: false },
  { title: '待结算', time: '待确认', detail: '费用核对完成后进入待结算', done: false },
];

export const detailSections = {
  status: {
    label: '当前状态',
    value: '待结算',
    tone: 'warning',
    helper: '费用已核对，等待管理员完成结算。',
  },
  vehicle: [
    { label: '车牌号', value: '蒙A3816' },
    { label: '车型', value: '丰田 凯美瑞' },
    { label: '车架号', value: 'LVGBM51K8NG062816' },
    { label: '维修顾问', value: '张工' },
  ],
  customer: [
    { label: '客户', value: '张先生' },
    { label: '电话', value: '138****7216' },
    { label: '保险公司', value: '人保财险' },
    { label: '保单到期', value: '2026-12-28' },
  ],
  repair: [
    { label: '维修内容', value: '右前翼子板钣金喷漆，更换右前大灯总成' },
    { label: '配件状态', value: '大灯总成已到货，旧件已拍照留档' },
    { label: '预计交付', value: '今天 17:30' },
  ],
  insurance: [
    { label: '报案号', value: 'PIC20260715018' },
    { label: '事故类型', value: '钣喷维修（含更换件）' },
    { label: '出险备注', value: '右前侧剐蹭，保险已核损通过' },
  ],
  cost: [
    { label: '工时费', value: '680' },
    { label: '材料费', value: '2,360' },
    { label: '合计', value: '3,040' },
  ],
  notes: [
    '客户要求提车前再次清洁内饰。',
    '结算完成后需同步通知保险专员回访。',
  ],
};

export const settlementSummary = [
  { label: '工时费', value: '680' },
  { label: '材料费', value: '2,360' },
  { label: '合计', value: '3,040' },
  { label: '支付方式', value: '保险转账' },
  { label: '结算备注', value: '等待到账回执后完成结算确认' },
];

export const receiptFile = {
  name: 'receipt-20260715.jpg',
  size: '2.8 MB',
  updatedAt: '今天 10:24',
  uploader: '财务小李',
};

export const customerRecords = [
  {
    plate: '蒙K·A3816',
    customer: '张先生',
    phone: '138****7216',
    model: '丰田 凯美瑞',
    vehicleType: '标的车',
    insurer: '人保财险',
    repairs: 2,
  },
  {
    plate: '蒙K·Q7285',
    customer: '李女士',
    phone: '139****1182',
    model: '大众 途观 L',
    vehicleType: '三者车',
    insurer: '平安保险',
    repairs: 1,
  },
];

export const insuranceRecords = [
  {
    plate: '蒙K·B2207',
    customer: '赵先生',
    model: '本田 CR-V',
    insurer: '太平洋保险',
    expiryDate: '2026-07-18',
    remaining: '3天到期',
    tone: 'danger',
  },
  {
    plate: '蒙K·A3816',
    customer: '张先生',
    model: '丰田 凯美瑞',
    insurer: '人保财险',
    expiryDate: '2026-12-28',
    remaining: '正常',
    tone: 'success',
  },
];

export const historyRecords = [
  {
    orderNo: 'RO202607080011',
    plate: '蒙K·A3816',
    customer: '张先生',
    model: '丰田 凯美瑞',
    repairSummary: '前保险杠喷漆，右前大灯检测',
    amount: '3,040',
    settledAt: '07-08 18:03',
    hasReceipt: true,
  },
  {
    orderNo: 'RO202606210026',
    plate: '蒙K·Q7285',
    customer: '李女士',
    model: '大众 途观 L',
    repairSummary: '左后门钣金整形与喷漆',
    amount: '2,860',
    settledAt: '06-21 16:40',
    hasReceipt: false,
  },
];

export const profileRows = [
  { label: '登录账号', value: '002 · 张工' },
  { label: '当前角色', value: '维修顾问 · 员工权限' },
  { label: '当前门店', value: '通达汽车服务中心' },
  { label: '云端同步', value: '最后成功 07-16 09:36', status: '正常' },
  { label: '应用版本', value: 'Android 规划版 0.1.0' },
  { label: '版本更新', value: '当前已是最新版本' },
];

export const cachedOrders = [
  {
    orderNo: 'RO202607150021',
    plate: '蒙K·Q7285',
    customer: '李女士',
    phone: '139****1182',
    statusLabel: '在修',
    statusTone: 'success',
    repairSummary: '左后门钣金整形，等待喷漆复检',
    amountLabel: '预估 2,860',
    updatedAt: '上次同步 09:20',
  },
];
