export const companies = [
  { shortName: '通达汽车服务中心', fullName: '鄂尔多斯市通达汽车服务有限公司' },
  { shortName: '鑫齐恒汽车服务中心', fullName: '鄂尔多斯市鑫齐恒汽车服务有限公司' },
];

export const sampleOrder = {
  orderNo: 'RO202607150018',
  plate: '蒙K·A3816',
  customer: '张先生',
  phone: '138****7216',
  model: '丰田 凯美瑞',
  vin: 'LVGBM51K8NG062816',
  insurer: '人保财险',
  expiryDate: '2026-12-28',
  claimNo: 'PIC20260715018',
  accidentType: '钣喷维修（有换件）',
  repairContent: '右前翼子板钣金喷漆，更换右前大灯',
  laborFee: 680,
  materialFee: 2360,
  total: 3040,
  staff: '张工',
};

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
