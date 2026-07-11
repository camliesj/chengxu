import React, { useEffect, useMemo, useState } from 'react';

const navItems = ['首页看板', '维修接待', '历史查询', '车辆保险', '客户车辆', '汇总报表', '数据导出', '系统设置'];

const companies = [
  { id: 'tongda', shortName: '通达汽车服务中心', fullName: '鄂尔多斯市通达汽车服务有限公司' },
  { id: 'xinqiheng', shortName: '鑫齐恒汽车服务中心', fullName: '鄂尔多斯市鑫齐恒汽车服务有限公司' },
];

const iconBase = '/assets/ui/icons/';

const navIconMap = {
  首页看板: 'nav-home.png',
  维修接待: 'nav-repair.png',
  历史查询: 'nav-history.png',
  车辆保险: 'nav-insurance.png',
  客户车辆: 'nav-customers.png',
  汇总报表: 'nav-reports.png',
  数据导出: 'nav-export.png',
  系统设置: 'nav-settings.png',
};

const metricIconMap = {
  yuan: 'metric-yuan.png',
  car: 'metric-car.png',
  order: 'metric-order.png',
  shield: 'metric-shield.png',
};

const workbenchIconMap = {
  revenue: 'wb-metric-revenue.png',
  count: 'wb-metric-count.png',
  pending: 'wb-metric-pending.png',
  repairing: 'wb-metric-repairing.png',
  insurance: 'wb-metric-insurance.png',
  todo: 'wb-todo-alert.png',
  refresh: 'wb-action-refresh.png',
  workflow: 'wb-flow-workflow.png',
  trend: 'wb-chart-trend.png',
  status: 'wb-chart-status.png',
  cost: 'wb-chart-cost.png',
  table: 'wb-table-orders.png',
  empty: 'wb-empty-state.png',
};

const ORDER_STORAGE_KEY = 'chengxu-repair-orders';
const INSURANCE_STORAGE_KEY = 'chengxu-insurance-policies';
const CUSTOMER_VEHICLE_STORAGE_KEY = 'chengxu-customer-vehicles';
const ACCESS_SESSION_KEY = 'chengxu-access-session';
const INSURANCE_BASE_DATE = '2026-07-21';
const defaultInsurerOptions = ['人保财险', '平安保险', '太平洋保险', '阳光保险'];
const defaultStaffEntries = [
  { id: 'default-staff-1', value: '接待顾问', extra: '张工', isActive: true },
  { id: 'default-staff-2', value: '维修顾问', extra: '王工', isActive: true },
  { id: 'default-staff-3', value: '结算专员', extra: '李工', isActive: true },
];
const permissionItems = [
  { key: 'repair', label: '维修接待' },
  { key: 'history', label: '历史查询' },
  { key: 'insurance', label: '车辆保险' },
  { key: 'customers', label: '客户车辆' },
  { key: 'reports', label: '汇总报表' },
  { key: 'export', label: '数据导出' },
  { key: 'settings', label: '系统设置' },
  { key: 'voidOrder', label: '作废工单' },
  { key: 'logs', label: '操作日志' },
];
const allPermissionKeys = permissionItems.map((item) => item.key);
const defaultStaffPermissions = ['repair', 'history', 'insurance', 'customers', 'reports'];

function companyById(companyId) {
  return companies.find((company) => company.id === companyId) || companies[0];
}

function permissionsForSession(session) {
  if (session?.role === 'admin') return allPermissionKeys;
  return Array.isArray(session?.permissions) && session.permissions.length > 0 ? session.permissions : defaultStaffPermissions;
}

function hasUiPermission(session, permission) {
  return permissionsForSession(session).includes(permission);
}

function dictionaryStaffLabel(entry) {
  return `${entry.value || ''}${entry.extra ? ` ${entry.extra}` : ''}`.trim();
}

function AssetIcon({ name, alt = '', className = '' }) {
  return <img className={className} src={`${iconBase}${name}`} alt={alt} aria-hidden={alt ? undefined : 'true'} />;
}

function WorkbenchIcon({ name, alt = '', className = '' }) {
  return <img className={className} src={`/assets/ui/workbench/icons/${name}`} alt={alt} aria-hidden={alt ? undefined : 'true'} />;
}

const repairOrders = [];

const orderRepository = {
  listOrders(sourceOrders) {
    return [...sourceOrders];
  },
};

function readStoredOrders() {
  try {
    const rawOrders = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!rawOrders) return [];
    const parsedOrders = JSON.parse(rawOrders);
    return Array.isArray(parsedOrders) ? parsedOrders : [];
  } catch {
    return [];
  }
}

function authHeaders(session) {
  return session?.token ? { authorization: `Bearer ${session.token}` } : {};
}

async function validateAccess(credentials) {
  const response = await fetch('/api/access', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    throw new Error('账号、密码或公司不正确');
  }
  return response.json();
}

async function fetchCloudOrders(session) {
  const response = await fetch('/api/orders', {
    headers: authHeaders(session),
  });
  if (!response.ok) {
    throw new Error(`云端读取失败：${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.orders) ? data.orders : [];
}

async function saveCloudOrder(order, session) {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(session) },
    body: JSON.stringify({ order }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const messageMap = {
      SETTLEMENT_ADMIN_REQUIRED: '当前账号无结算或返结算权限，请联系管理员操作',
    };
    throw new Error(messageMap[data.error] || data.error || `云端保存失败：${response.status}`);
  }
  return response.json();
}

async function voidCloudOrder(orderId, reason, session) {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/void`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(session) },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `作废失败：${response.status}`);
  }
  return response.json();
}

async function fetchOperationLogs(session) {
  const response = await fetch('/api/operation-logs', {
    headers: authHeaders(session),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `日志读取失败：${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.logs) ? data.logs : [];
}

async function updateAccessCode(role, code, session, id = '') {
  const response = await fetch('/api/access-code', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(session) },
    body: JSON.stringify({ id, role, code }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const messageMap = {
      CANNOT_REMOVE_LAST_ADMIN_CODE: '不能移除最后一个启用的管理员访问码',
      CODE_MUST_BE_4_TO_12_DIGITS: '访问码需为4-12位数字',
    };
    throw new Error(messageMap[data.error] || data.error || `访问码修改失败：${response.status}`);
  }
  return response.json();
}

async function deleteAccessCode(id, session) {
  const response = await fetch('/api/access-code', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(session) },
    body: JSON.stringify({ action: 'delete', id }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const messageMap = {
      CANNOT_DELETE_LAST_ADMIN_CODE: '不能删除最后一个启用的管理员访问码',
      ACCESS_CODE_NOT_FOUND: '访问码不存在或已删除',
    };
    throw new Error(messageMap[data.error] || data.error || `访问码删除失败：${response.status}`);
  }
  return response.json();
}

async function unlockAccessCodePanel(adminCode, session) {
  const response = await fetch('/api/access-code', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(session) },
    body: JSON.stringify({ action: 'unlock', adminCode }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error === 'INVALID_ADMIN_CODE' ? '管理员访问码不正确' : data.error || `访问码信息读取失败：${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.codes) ? data.codes : [];
}

async function fetchAccounts(session) {
  const response = await fetch('/api/accounts', {
    headers: authHeaders(session),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `账号读取失败：${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.accounts) ? data.accounts : [];
}

async function saveAccount(account, session) {
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(session) },
    body: JSON.stringify(account),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const messageMap = {
      USERNAME_EXISTS: '账号已存在',
      USERNAME_FORMAT_INVALID: '账号只能使用3-24位字母、数字或下划线',
      PASSWORD_FORMAT_INVALID: '密码需为6-32位',
      CANNOT_DISABLE_LAST_ADMIN: '不能停用或降级最后一个管理员账号',
      INVALID_COMPANY: '请选择账号所属公司',
    };
    throw new Error(messageMap[data.error] || data.error || `账号保存失败：${response.status}`);
  }
  return response.json();
}

async function deleteAccount(id, session) {
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(session) },
    body: JSON.stringify({ action: 'delete', id }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const messageMap = {
      CANNOT_DELETE_LAST_ADMIN: '不能删除最后一个管理员账号',
      ACCOUNT_NOT_FOUND: '账号不存在或已删除',
    };
    throw new Error(messageMap[data.error] || data.error || `账号删除失败：${response.status}`);
  }
  return response.json();
}

async function fetchDictionaries(session) {
  const response = await fetch('/api/dictionaries', {
    headers: authHeaders(session),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `字典读取失败：${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.dictionaries) ? data.dictionaries : [];
}

async function saveDictionaryEntry(entry, session) {
  const response = await fetch('/api/dictionaries', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(session) },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const messageMap = {
      DICTIONARY_VALUE_REQUIRED: '请填写字典名称',
      STAFF_NAME_REQUIRED: '请填写人员名称',
      PERMISSION_REQUIRED: '当前账号无权维护系统字典',
    };
    throw new Error(messageMap[data.error] || data.error || `字典保存失败：${response.status}`);
  }
  return response.json();
}

async function deleteDictionaryEntry(id, session) {
  const response = await fetch('/api/dictionaries', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(session) },
    body: JSON.stringify({ action: 'delete', id }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `字典删除失败：${response.status}`);
  }
  return response.json();
}

async function uploadSettlementReceipt(file, orderId, session) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('orderId', orderId);
  const response = await fetch('/api/receipts', {
    method: 'POST',
    headers: authHeaders(session),
    body: formData,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const messageMap = {
      COS_NOT_CONFIGURED: '腾讯云 COS 尚未配置，请先在 Cloudflare 中配置 COS 密钥',
      FILE_REQUIRED: '请选择到账回执截图',
      ORDER_ID_REQUIRED: '缺少工单号',
      UNSUPPORTED_FILE_TYPE: '仅支持 JPG、PNG、WEBP 图片',
      FILE_TOO_LARGE: '图片过大，请压缩后上传',
      RECEIPT_UPLOAD_FAILED: '回执上传失败，请稍后重试',
    };
    throw new Error(messageMap[data.error] || data.error || `回执上传失败：${response.status}`);
  }
  const data = await response.json();
  return data.receipt;
}

async function fetchSettlementReceiptBlob(key, session) {
  const response = await fetch(`/api/receipts?key=${encodeURIComponent(key)}`, {
    headers: authHeaders(session),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error === 'COS_NOT_CONFIGURED' ? '腾讯云 COS 尚未配置' : data.error || `回执读取失败：${response.status}`);
  }
  return response.blob();
}

async function deleteSettlementReceipt(key, orderId, session) {
  const response = await fetch('/api/receipts', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json', ...authHeaders(session) },
    body: JSON.stringify({ key, orderId }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error === 'COS_NOT_CONFIGURED' ? '腾讯云 COS 尚未配置' : data.error || `回执删除失败：${response.status}`);
  }
  return response.json();
}

function normalizeInsurancePolicy(policy, index = 0) {
  return {
    id: policy.id || `IP${Date.now()}${index}`,
    companyId: policy.companyId || 'tongda',
    plate: policy.plate || '',
    customer: policy.customer || '',
    phone: policy.phone || '',
    car: policy.car || '',
    vin: policy.vin || '',
    expiry: policy.expiry || INSURANCE_BASE_DATE,
    amount: Number(policy.amount) || 0,
    type: policy.type || '交强险 / 商业险',
    insurer: policy.insurer || '人保财险',
  };
}

function readStoredInsurancePolicies() {
  try {
    const rawPolicies = localStorage.getItem(INSURANCE_STORAGE_KEY);
    if (!rawPolicies) return insuranceRows;
    const parsedPolicies = JSON.parse(rawPolicies);
    return Array.isArray(parsedPolicies) && parsedPolicies.length > 0
      ? parsedPolicies.map(normalizeInsurancePolicy)
      : insuranceRows;
  } catch {
    return insuranceRows;
  }
}

function currentDateValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function currentTimeLabel() {
  return new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function monthRange(year, month) {
  const paddedMonth = String(month).padStart(2, '0');
  const lastDay = new Date(Number(year), month, 0).getDate();
  return {
    start: `${year}-${paddedMonth}-01`,
    end: `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`,
  };
}

function monthShortcutValue(dateRange) {
  if (!dateRange.start || !dateRange.end) return '';
  const match = /^(\d{4})-(\d{2})-01$/.exec(dateRange.start);
  if (!match) return '';
  const month = Number(match[2]);
  const range = monthRange(match[1], month);
  return range.end === dateRange.end ? String(month) : '';
}

function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
}

function daysUntilExpiry(expiry) {
  const base = new Date(`${currentDateValue()}T00:00:00`);
  const target = new Date(`${expiry}T00:00:00`);
  return Math.ceil((target.getTime() - base.getTime()) / 86400000);
}

function insuranceState(policy) {
  const days = daysUntilExpiry(policy.expiry);
  if (days < 0) return '已过期';
  if (days <= 7) return '7天内到期';
  if (days <= 30) return '30天内到期';
  return '正常';
}

function isInsuranceUrgent(policy) {
  return ['已过期', '7天内到期'].includes(insuranceState(policy));
}

function normalizeCustomerVehicle(vehicle, index = 0) {
  return {
    id: vehicle.id || `CV${Date.now()}${index}`,
    companyId: vehicle.companyId || 'tongda',
    customer: vehicle.customer || '',
    phone: vehicle.phone || '',
    plate: vehicle.plate || '',
    car: vehicle.car || '',
    vin: vehicle.vin || '',
    insurer: vehicle.insurer || '人保财险',
    vehicleType: vehicle.vehicleType || '标的车',
    source: vehicle.source || '手动录入',
    remark: vehicle.remark || '',
  };
}

function readStoredCustomerVehicles() {
  try {
    const rawVehicles = localStorage.getItem(CUSTOMER_VEHICLE_STORAGE_KEY);
    if (!rawVehicles) return customerVehicleRows;
    const parsedVehicles = JSON.parse(rawVehicles);
    return Array.isArray(parsedVehicles) && parsedVehicles.length > 0
      ? parsedVehicles.map(normalizeCustomerVehicle)
      : customerVehicleRows;
  } catch {
    return customerVehicleRows;
  }
}

const insuranceRows = [
  { id: 'IP20260725001', plate: '粤B·8A123', customer: '陈先生', phone: '138****5678', car: '本田 凯美瑞', vin: 'LFV3A24G6N30***21', expiry: '2026-07-25', amount: 6520, type: '交强险 / 商业险', insurer: '人保财险' },
  { id: 'IP20260811002', plate: '粤A·3C789', customer: '李女士', phone: '139****1234', car: '大众 迈腾', vin: 'LBV8W3109P0***82', expiry: '2026-08-11', amount: 7340, type: '车损 / 三者 / 座位', insurer: '平安保险' },
  { id: 'IP20260629003', plate: '粤B·7D555', customer: '刘先生', phone: '137****8888', car: '大众 迈腾', vin: 'LC0CE4CD8N0***47', expiry: '2026-06-29', amount: 5100, type: '交强险 / 三者', insurer: '太平洋保险' },
];

const customerVehicleRows = [
  { id: 'CV20260723001', customer: '陈先生', phone: '138****5678', plate: '粤B·8A123', car: '本田 凯美瑞', vin: 'LFV3A24G6N30***21', insurer: '人保财险', vehicleType: '标的车', source: '维修接待', remark: '常规保养客户，保险即将到期。' },
  { id: 'CV20260723002', customer: '李女士', phone: '139****1234', plate: '粤A·3C789', car: '大众 迈腾', vin: 'LBV8W3109P0***82', insurer: '平安保险', vehicleType: '三者车', source: '维修接待', remark: '已完工，待交车。' },
  { id: 'CV20260723003', customer: '刘先生', phone: '137****8888', plate: '粤B·7D555', car: '大众 迈腾', vin: 'LC0CE4CD8N0***47', insurer: '太平洋保险', vehicleType: '标的车', source: '保险台账', remark: '保险已过期，需优先跟进。' },
  { id: 'CV20260722004', customer: '周女士', phone: '135****8766', plate: '粤B·2F333', car: '别克 英朗', vin: 'LSGKE5418NW0***33', insurer: '人保财险', vehicleType: '标的车', source: '历史维修', remark: '已结算客户。' },
];

const productionTrend = [68, 68, 82, 92, 125, 112, 132, 158, 98, 92, 112, 108, 152, 158, 120, 98, 70, 138];

const formatMoney = (value) => `¥${value.toLocaleString('zh-CN')}`;

function AccessGate({ onUnlock }) {
  const [companyId, setCompanyId] = useState('tongda');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitAccess(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const data = await validateAccess({
        companyId,
        username: username.trim(),
        password: password.trim(),
      });
      localStorage.setItem('shop-access-granted', 'true');
      localStorage.setItem(ACCESS_SESSION_KEY, JSON.stringify(data.session));
      onUnlock(data.session);
    } catch (accessError) {
      setError(accessError.message || '账号、密码或公司不正确');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="access-page">
      <section className="access-panel">
        <div className="access-copy">
          <h1>维修接待与车辆保险管理</h1>
          <p>请选择公司并输入账号密码，进入对应门店工作台。</p>
        </div>
        <form onSubmit={submitAccess} className="access-form">
          <label htmlFor="company-id">公司</label>
          <select id="company-id" value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.shortName}</option>)}
          </select>
          <label htmlFor="login-username">账号</label>
          <input
            id="login-username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError('');
            }}
            placeholder="请输入账号"
            autoComplete="username"
          />
          <label htmlFor="login-password">密码</label>
          <input
            id="login-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError('');
            }}
            placeholder="请输入密码"
            type="password"
            autoComplete="current-password"
          />
          {error ? <span className="form-error">{error}</span> : null}
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? '登录中...' : '进入系统'}</button>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [accessSession, setAccessSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ACCESS_SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [isUnlocked, setIsUnlocked] = useState(() => localStorage.getItem('shop-access-granted') === 'true' && !!localStorage.getItem(ACCESS_SESSION_KEY));
  const [activePage, setActivePage] = useState('首页看板');
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '2026-07-01', end: '2026-07-31' });
  const [orders, setOrders] = useState(readStoredOrders);
  const [insurancePolicies, setInsurancePolicies] = useState(readStoredInsurancePolicies);
  const [customerVehicles, setCustomerVehicles] = useState(readStoredCustomerVehicles);
  const [dictionaries, setDictionaries] = useState([]);
  const [createRequest, setCreateRequest] = useState(0);
  const [receptionFocus, setReceptionFocus] = useState(null);
  const [insuranceFocusRequest, setInsuranceFocusRequest] = useState(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [ordersCloudState, setOrdersCloudState] = useState({ loading: false, error: '' });
  const [lastRefreshAt, setLastRefreshAt] = useState('');

  const currentCompany = companyById(accessSession?.companyId || 'tongda');
  const isAdmin = accessSession?.role === 'admin';
  const canExportData = hasUiPermission(accessSession, 'export');
  const canOpenSettings = hasUiPermission(accessSession, 'settings');
  const canVoidOrder = hasUiPermission(accessSession, 'voidOrder');
  const canViewLogs = hasUiPermission(accessSession, 'logs');
  const canSettleOrder = isAdmin;
  const orderData = useMemo(() => orderRepository.listOrders(orders), [orders]);
  const companyOrders = useMemo(
    () => orderData.filter((order) => (order.companyId || 'tongda') === currentCompany.id),
    [orderData, currentCompany.id],
  );
  const companyInsurancePolicies = useMemo(
    () => insurancePolicies.filter((policy) => (policy.companyId || 'tongda') === currentCompany.id),
    [insurancePolicies, currentCompany.id],
  );
  const companyCustomerVehicles = useMemo(
    () => customerVehicles.filter((vehicle) => (vehicle.companyId || 'tongda') === currentCompany.id),
    [customerVehicles, currentCompany.id],
  );
  const insurerChoices = useMemo(() => {
    const values = dictionaries
      .filter((entry) => entry.category === 'insurer' && entry.isActive)
      .map((entry) => entry.value)
      .filter(Boolean);
    return values.length > 0 ? values : defaultInsurerOptions;
  }, [dictionaries]);
  const staffEntries = useMemo(() => {
    const entries = dictionaries.filter((entry) => entry.category === 'staff' && entry.isActive);
    return entries.length > 0 ? entries : defaultStaffEntries;
  }, [dictionaries]);
  const staffChoices = useMemo(() => staffEntries.map(dictionaryStaffLabel).filter(Boolean), [staffEntries]);
  const currentYear = (dateRange.start || currentDateValue()).slice(0, 4);
  const monthShortcut = monthShortcutValue(dateRange);

  useEffect(() => {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    if (!isUnlocked || !accessSession?.token) return undefined;
    let isCancelled = false;
    setOrdersCloudState({ loading: true, error: '' });
    fetchCloudOrders(accessSession)
      .then((cloudOrders) => {
        if (isCancelled) return;
        setOrders(cloudOrders);
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(cloudOrders));
        setOrdersCloudState({ loading: false, error: '' });
        setLastRefreshAt(currentTimeLabel());
      })
      .catch((error) => {
        if (isCancelled) return;
        setOrdersCloudState({ loading: false, error: error.message || '云端连接失败' });
      });
    return () => {
      isCancelled = true;
    };
  }, [isUnlocked, accessSession]);

  useEffect(() => {
    if (!isUnlocked || !accessSession?.token) return undefined;
    let isCancelled = false;
    fetchDictionaries(accessSession)
      .then((nextDictionaries) => {
        if (!isCancelled) setDictionaries(nextDictionaries);
      })
      .catch(() => {
        if (!isCancelled) setDictionaries([]);
      });
    return () => {
      isCancelled = true;
    };
  }, [isUnlocked, accessSession]);

  useEffect(() => {
    localStorage.setItem(INSURANCE_STORAGE_KEY, JSON.stringify(insurancePolicies));
  }, [insurancePolicies]);

  useEffect(() => {
    localStorage.setItem(CUSTOMER_VEHICLE_STORAGE_KEY, JSON.stringify(customerVehicles));
  }, [customerVehicles]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [activePage]);

  useEffect(() => {
    if (!isUnlocked || !accessSession?.token) return undefined;
    const timer = window.setInterval(() => {
      refreshOrders();
    }, 60000);
    return () => window.clearInterval(timer);
  }, [isUnlocked, accessSession]);

  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return companyOrders.filter((order) => {
      const orderDate = orderDateValue(order.date);
      const inDateRange = (!dateRange.start || orderDate >= dateRange.start) && (!dateRange.end || orderDate <= dateRange.end);
      const inKeyword = !keyword || orderSearchText(order)
        .toLowerCase()
        .includes(keyword);
      return inDateRange && inKeyword;
    });
  }, [companyOrders, query, dateRange]);

  function refreshOrders() {
    if (!accessSession?.token) return;
    setOrdersCloudState({ loading: true, error: '' });
    fetchCloudOrders(accessSession)
      .then((cloudOrders) => {
        setOrders(cloudOrders);
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(cloudOrders));
        setOrdersCloudState({ loading: false, error: '' });
        setLastRefreshAt(currentTimeLabel());
      })
      .catch((error) => setOrdersCloudState({ loading: false, error: error.message || '云端刷新失败' }));
  }

  function upsertOrder(nextOrder) {
    const scopedOrder = { ...nextOrder, companyId: currentCompany.id };
    setOrders((currentOrders) => {
      const exists = currentOrders.some((order) => order.id === scopedOrder.id);
      if (exists) {
        return currentOrders.map((order) => (order.id === scopedOrder.id ? scopedOrder : order));
      }
      return [scopedOrder, ...currentOrders];
    });
    saveCloudOrder(scopedOrder, accessSession)
      .then(() => {
        setOrdersCloudState({ loading: false, error: '' });
        setLastRefreshAt(currentTimeLabel());
      })
      .catch((error) => setOrdersCloudState({ loading: false, error: error.message || '云端保存失败' }));
  }

  function clearOrderReceipt(order) {
    if (!order?.settlementReceiptKey) return Promise.resolve(order);
    return deleteSettlementReceipt(order.settlementReceiptKey, order.id, accessSession)
      .then(() => {
        const nextOrder = {
          ...order,
          settlementReceiptKey: '',
          settlementReceiptName: '',
          settlementReceiptType: '',
          settlementReceiptSize: 0,
          settlementReceiptUploadedAt: '',
        };
        upsertOrder(nextOrder);
        return nextOrder;
      });
  }

  function saveOrder(nextOrder) {
    upsertOrder(nextOrder);
    syncCustomerVehicleFromOrder(nextOrder);
    syncInsurancePolicyFromOrder(nextOrder);
  }

  function syncCustomerVehicleFromOrder(order) {
    const normalizedVehicle = normalizeCustomerVehicle({
      companyId: currentCompany.id,
      customer: order.customer,
      phone: order.phone,
      plate: order.plate,
      car: order.car,
      vin: order.vin,
      insurer: order.insurer,
      vehicleType: order.type,
      source: '维修接待',
      remark: `最近工单：${order.id}`,
    });

    setCustomerVehicles((currentVehicles) => {
      const existing = currentVehicles.find((vehicle) =>
        (vehicle.companyId || 'tongda') === currentCompany.id &&
        (vehicle.plate === order.plate || (vehicle.plate === order.plate && vehicle.phone === order.phone)),
      );
      if (!existing) return [normalizedVehicle, ...currentVehicles];
      return currentVehicles.map((vehicle) => (
        vehicle.id === existing.id ? { ...existing, ...normalizedVehicle, id: existing.id } : vehicle
      ));
    });
  }

  function syncInsurancePolicyFromOrder(order) {
    if (!order.insuranceExpiry) return;
    setInsurancePolicies((currentPolicies) => {
      const existing = currentPolicies.find((policy) =>
        (policy.companyId || 'tongda') === currentCompany.id && policy.plate === order.plate,
      );
      const normalizedPolicy = normalizeInsurancePolicy({
        ...(existing || {}),
        id: existing?.id || `IP${Date.now()}`,
        companyId: currentCompany.id,
        plate: order.plate,
        customer: order.customer,
        phone: order.phone,
        car: order.car,
        vin: order.vin,
        expiry: order.insuranceExpiry,
        amount: existing?.amount || 0,
        type: existing?.type || '交强险 / 商业险',
        insurer: order.insurer,
      });
      if (!existing) return [normalizedPolicy, ...currentPolicies];
      return currentPolicies.map((policy) => (policy.id === existing.id ? normalizedPolicy : policy));
    });
  }

  function updateOrderStatus(orderId, status) {
    const currentOrder = companyOrders.find((order) => order.id === orderId);
    if (!currentOrder) return;
    upsertOrder({ ...currentOrder, status });
  }

  function voidOrder(orderId, reason) {
    const currentOrder = companyOrders.find((order) => order.id === orderId);
    if (!currentOrder) return;
    setOrders((currentOrders) => currentOrders.filter((order) => order.id !== orderId));
    voidCloudOrder(orderId, reason, accessSession)
      .then(() => setOrdersCloudState({ loading: false, error: '' }))
      .catch((error) => {
        setOrders((currentOrders) => [currentOrder, ...currentOrders]);
        setOrdersCloudState({ loading: false, error: error.message || '云端作废失败' });
      });
  }

  function openOrderInReception(order, mode) {
    setQuery('');
    setReceptionFocus({ id: order.id, mode, requestId: Date.now() });
    setActivePage('维修接待');
  }

  function openInsurancePolicy(policy) {
    setQuery('');
    setInsuranceFocusRequest({ id: policy.id, requestId: Date.now() });
    setActivePage('车辆保险');
  }

  function logout() {
    localStorage.removeItem('shop-access-granted');
    localStorage.removeItem(ACCESS_SESSION_KEY);
    setAccessSession(null);
    setIsUnlocked(false);
  }

  function saveInsurancePolicy(nextPolicy) {
    setInsurancePolicies((currentPolicies) => {
      const normalizedPolicy = normalizeInsurancePolicy({ ...nextPolicy, companyId: currentCompany.id });
      const exists = currentPolicies.some((policy) => policy.id === normalizedPolicy.id);
      if (exists) {
        return currentPolicies.map((policy) => (policy.id === normalizedPolicy.id ? normalizedPolicy : policy));
      }
      return [normalizedPolicy, ...currentPolicies];
    });
  }

  function saveCustomerVehicle(nextVehicle) {
    setCustomerVehicles((currentVehicles) => {
      const normalizedVehicle = normalizeCustomerVehicle({ ...nextVehicle, companyId: currentCompany.id });
      const exists = currentVehicles.some((vehicle) => vehicle.id === normalizedVehicle.id);
      if (exists) {
        return currentVehicles.map((vehicle) => (vehicle.id === normalizedVehicle.id ? normalizedVehicle : vehicle));
      }
      return [normalizedVehicle, ...currentVehicles];
    });
  }

  const urgentInsurancePolicies = companyInsurancePolicies.filter(isInsuranceUrgent);
  const unsettledOrders = companyOrders.filter(isOrderUnsettled);
  const staleOrders = companyOrders.filter(isOrderStale);
  const todoCount = urgentInsurancePolicies.length + unsettledOrders.length + staleOrders.length;

  function openRepairDashboardList(nextQuery = '') {
    setQuery(nextQuery);
    setActivePage('维修接待');
    setNoticeOpen(false);
  }

  if (!isUnlocked) {
    return <AccessGate onUnlock={(session) => {
      setAccessSession(session);
      setIsUnlocked(true);
    }} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="sidebar-brand">
          <div>
            <strong>{currentCompany.shortName}</strong>
            <small>维修接待与车辆保险管理</small>
          </div>
        </div>
        <nav>
          {navItems.filter((item) => {
            const permissionMap = {
              维修接待: 'repair',
              历史查询: 'history',
              车辆保险: 'insurance',
              客户车辆: 'customers',
              汇总报表: 'reports',
              数据导出: 'export',
              系统设置: 'settings',
            };
            return !permissionMap[item] || hasUiPermission(accessSession, permissionMap[item]);
          }).map((item) => (
            <button
              key={item}
              className={activePage === item ? 'nav-item active' : 'nav-item'}
              onClick={() => setActivePage(item)}
            >
              <span><AssetIcon name={navIcon(item)} /></span>
              <b>{item}</b>
              <i>›</i>
            </button>
          ))}
        </nav>
        <button
          className="logout-button"
          onClick={logout}
        >
          ‹‹ 收起菜单
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="menu-button" aria-label="展开菜单">☰</button>
          <div className="date-range">
            <input type="date" value={dateRange.start} onChange={(event) => setDateRange((current) => ({ ...current, start: event.target.value }))} aria-label="开始日期" />
            <span>至</span>
            <input type="date" value={dateRange.end} onChange={(event) => setDateRange((current) => ({ ...current, end: event.target.value }))} aria-label="结束日期" />
            <select
              value={monthShortcut}
              onChange={(event) => {
                if (!event.target.value) return;
                setDateRange(monthRange(currentYear, Number(event.target.value)));
              }}
              aria-label="快捷选择月份"
            >
              <option value="">月份快捷</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={month}>{currentYear}年{month}月</option>
              ))}
            </select>
          </div>
          <div className="search-wrap">
            <AssetIcon name="action-search.png" className="field-icon" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索客户 / 车牌 / 手机号 / 工单号"
            />
          </div>
          <button
            className="primary-action"
            onClick={() => {
              setActivePage('维修接待');
              setCreateRequest((value) => value + 1);
            }}
          >
            ＋ 新增工单
          </button>
          {canExportData ? (
            <button className="secondary-action" onClick={() => setActivePage('数据导出')}><AssetIcon name="action-excel.png" className="button-icon" />导出Excel</button>
          ) : null}
          <div className="topbar-user">
            <button
              type="button"
              className="notice-button"
              onClick={() => {
                setNoticeOpen((open) => !open);
                setUserMenuOpen(false);
              }}
              aria-label="查看待处理提醒"
            >
              <span className="notice-dot">
                {todoCount}
              </span>
            </button>
            <button
              type="button"
              className="user-button"
              onClick={() => {
                setUserMenuOpen((open) => !open);
                setNoticeOpen(false);
              }}
              aria-label="打开账号菜单"
            >
              <span className="avatar" />
              <span>
                <strong>{accessSession?.role === 'admin' ? '管理员' : '员工'}</strong>
                <small>{accessSession?.label || '门店账号'}</small>
              </span>
            </button>
            {noticeOpen ? (
              <div className="topbar-popover notice-popover">
                <h3>待办中心</h3>
                <button type="button" onClick={() => openRepairDashboardList('待结算')}>
                  <b>未结算工单：{unsettledOrders.length} 单</b>
                  <span>点击进入维修接待，优先处理未结算车辆</span>
                </button>
                <button type="button" onClick={() => openRepairDashboardList('在修中')}>
                  <b>长期未更新：{staleOrders.length} 单</b>
                  <span>在修或完工超过 3 天未结算，需核对状态</span>
                </button>
                <button type="button" onClick={() => {
                  setActivePage('车辆保险');
                  setNoticeOpen(false);
                }}>
                  <b>保险到期：{urgentInsurancePolicies.length} 台</b>
                  <span>7 天内到期或已过期车辆，需跟进续保</span>
                </button>
                {urgentInsurancePolicies.slice(0, 3).map((policy) => (
                  <button
                    key={policy.id}
                    type="button"
                    onClick={() => {
                      openInsurancePolicy(policy);
                      setNoticeOpen(false);
                    }}
                  >
                    <b>{policy.plate} 保险到期</b>
                    <span>{policy.customer} · {insuranceState(policy)} · {policy.expiry}</span>
                  </button>
                ))}
                {unsettledOrders.slice(0, 3).map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => {
                      openOrderInReception(order, 'view');
                      setNoticeOpen(false);
                    }}
                  >
                    <b>{order.plate} 未结算工单</b>
                    <span>{order.customer} · {order.status} · {formatMoney(order.amount)}</span>
                  </button>
                ))}
                {todoCount === 0 ? (
                  <p>暂无待处理事项</p>
                ) : null}
              </div>
            ) : null}
            {userMenuOpen ? (
              <div className="topbar-popover user-popover">
                <h3>{accessSession?.role === 'admin' ? '门店管理员' : '门店员工'}</h3>
                <p>{accessSession?.displayName || accessSession?.label || '已登录账号'} · {currentCompany.shortName}</p>
                {canOpenSettings ? (
                  <button type="button" onClick={() => {
                    setActivePage('系统设置');
                    setUserMenuOpen(false);
                  }}>系统设置</button>
                ) : null}
                <button type="button" onClick={logout}>退出登录</button>
              </div>
            ) : null}
          </div>
        </header>

        {activePage === '首页看板' && (
          <Dashboard
            filteredOrders={filteredOrders}
            policies={companyInsurancePolicies}
            dateRange={dateRange}
            lastRefreshAt={lastRefreshAt}
            cloudState={ordersCloudState}
            onRefreshOrders={refreshOrders}
            onViewInsurance={openInsurancePolicy}
            onViewOrder={(order) => openOrderInReception(order, 'view')}
            onOpenRepairList={openRepairDashboardList}
            onOpenInsurance={() => setActivePage('车辆保险')}
            onSetDateRange={setDateRange}
          />
        )}
        {activePage === '维修接待' && (
          <RepairReception
            orders={filteredOrders}
            company={currentCompany}
            createRequest={createRequest}
            focusRequest={receptionFocus}
            onSaveOrder={saveOrder}
            onStatusChange={updateOrderStatus}
            cloudState={ordersCloudState}
            role={accessSession?.role || 'staff'}
            canSettleOrder={canSettleOrder}
            canVoidOrder={canVoidOrder}
            insurerOptions={insurerChoices}
            staffOptions={staffChoices}
            onUploadReceipt={(file, orderId) => uploadSettlementReceipt(file, orderId, accessSession)}
            onViewReceipt={(key) => fetchSettlementReceiptBlob(key, accessSession)}
            onDeleteReceipt={clearOrderReceipt}
            onVoidOrder={voidOrder}
          />
        )}
        {activePage === '历史查询' && (
          <HistoryQueryPage
            orders={companyOrders}
            insurerOptions={insurerChoices}
            onView={(order) => openOrderInReception(order, 'view')}
            onEdit={(order) => openOrderInReception(order, 'edit')}
          />
        )}
        {activePage === '车辆保险' && (
          <InsuranceLedger policies={companyInsurancePolicies} insurerOptions={insurerChoices} onSavePolicy={saveInsurancePolicy} focusPolicyRequest={insuranceFocusRequest} />
        )}
        {activePage === '客户车辆' && (
          <CustomerVehiclesPage
            vehicles={companyCustomerVehicles}
            orders={companyOrders}
            policies={companyInsurancePolicies}
            insurerOptions={insurerChoices}
            onSaveVehicle={saveCustomerVehicle}
          />
        )}
        {activePage === '数据导出' && canExportData && (
          <DataExportPage
            orders={companyOrders}
            policies={companyInsurancePolicies}
            vehicles={companyCustomerVehicles}
          />
        )}
        {activePage === '数据导出' && !canExportData && <NoPermissionPage title="数据导出" />}
        {activePage === '系统设置' && canOpenSettings && (
          <SystemSettingsPage
            session={accessSession}
            cloudState={ordersCloudState}
            orders={companyOrders}
            dictionaries={dictionaries}
            canViewLogs={canViewLogs}
            onDictionariesChange={setDictionaries}
            onRefreshOrders={refreshOrders}
          />
        )}
        {activePage === '系统设置' && !canOpenSettings && <NoPermissionPage title="系统设置" />}
        {!['首页看板', '维修接待', '历史查询', '车辆保险', '客户车辆', '数据导出', '系统设置'].includes(activePage) && (
          <PlaceholderPage title={activePage} orders={filteredOrders} />
        )}
      </main>

      <MobileTabs activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}

function Dashboard({
  filteredOrders,
  policies,
  dateRange,
  lastRefreshAt,
  cloudState,
  onRefreshOrders,
  onViewInsurance,
  onViewOrder,
  onOpenRepairList,
  onOpenInsurance,
  onSetDateRange,
}) {
  const total = filteredOrders.reduce((sum, order) => sum + order.amount, 0);
  const activeOrders = filteredOrders.filter(isOrderUnsettled);
  const pendingAmount = activeOrders.reduce((sum, order) => sum + order.amount, 0);
  const repairingOrders = filteredOrders.filter((order) => order.status === REPAIR_STATUS.repairing);
  const completedOrders = filteredOrders.filter((order) => order.status === REPAIR_STATUS.completed);
  const pendingSettlementOrders = filteredOrders.filter((order) => order.status === REPAIR_STATUS.pendingSettlement);
  const settledOrders = filteredOrders.filter((order) => order.status === REPAIR_STATUS.settled);
  const today = currentDateValue();
  const todayOrders = filteredOrders.filter((order) => orderDateValue(order.date) === today);
  const todayAmount = todayOrders.reduce((sum, order) => sum + order.amount, 0);
  const laborTotal = filteredOrders.reduce((sum, order) => sum + order.labor, 0);
  const materialTotal = filteredOrders.reduce((sum, order) => sum + order.material, 0);
  const costTotal = laborTotal + materialTotal;
  const laborPercent = costTotal > 0 ? Math.round((laborTotal / costTotal) * 100) : 0;
  const materialPercent = costTotal > 0 ? 100 - laborPercent : 0;
  const urgentPolicies = policies.filter(isInsuranceUrgent);
  const trend = dashboardTrend(filteredOrders, dateRange);
  const staleOrders = filteredOrders.filter(isOrderStale);
  const rangeText = `${dateRange.start || '不限'} 至 ${dateRange.end || '不限'}`;
  const todoItems = [
    {
      tone: 'orange',
      title: '待结算工单',
      value: `${pendingSettlementOrders.length} 单`,
      detail: pendingSettlementOrders.length ? '需核对金额并上传到账回执' : '当前没有待结算工单',
      action: () => onOpenRepairList(REPAIR_STATUS.pendingSettlement),
    },
    {
      tone: 'red',
      title: '保险到期',
      value: `${urgentPolicies.length} 台`,
      detail: urgentPolicies.length ? '7天内到期或已过期，建议优先跟进' : '暂无紧急保险提醒',
      action: onOpenInsurance,
    },
    {
      tone: 'blue',
      title: '长期未更新',
      value: `${staleOrders.length} 单`,
      detail: staleOrders.length ? '在修或完工超过3天未结算' : '状态更新正常',
      action: () => onOpenRepairList(REPAIR_STATUS.repairing),
    },
  ];

  function focusToday() {
    onSetDateRange({ start: today, end: today });
    onOpenRepairList('');
  }

  return (
    <section className="workbench-page">
      <div className="workbench-hero">
        <div>
          <h2>门店经营概览</h2>
          <p>{rangeText} · {cloudState?.loading ? '正在同步云端数据' : `更新于 ${lastRefreshAt || '待刷新'}`}</p>
        </div>
        <div className="workbench-hero-actions">
          <span className={`cloud-state ${cloudState?.loading ? 'loading' : ''}`}><i />{cloudState?.loading ? '同步中' : '云端数据已连接'}</span>
          <button type="button" className="workbench-refresh" onClick={onRefreshOrders}><WorkbenchIcon name={workbenchIconMap.refresh} />刷新数据</button>
        </div>
      </div>

      <div className="workbench-metrics">
        <Metric variant="dashboard" icon="yuan" title="今日产值" value={formatMoney(todayAmount)} trend={`${todayOrders.length} 笔今日工单`} tone="blue" onClick={focusToday} />
        <Metric variant="dashboard" icon="car" title="今日台次" value={`${todayOrders.length} 台`} trend="查看今日进厂车辆" tone="blue" onClick={focusToday} />
        <Metric variant="dashboard" icon="order" title="待结算金额" value={formatMoney(pendingAmount)} trend={`${pendingSettlementOrders.length} 单待处理`} tone="orange" onClick={() => onOpenRepairList(REPAIR_STATUS.pendingSettlement)} />
        <Metric variant="dashboard" icon="shield" title="保险到期" value={`${urgentPolicies.length} 台`} trend="7天内到期或已过期" tone="red" onClick={onOpenInsurance} />
        <Metric variant="dashboard" icon="yuan" title="筛选产值" value={formatMoney(total)} trend={`${filteredOrders.length} 台 · 按当前日期`} tone="green" onClick={() => onOpenRepairList('')} />
      </div>

      <div className="dashboard-overview-grid">
        <section className="dashboard-insight-panel">
          <div className="panel-header">
            <div className="panel-title-copy"><h2>经营趋势</h2><p>产值及费用结构随顶部日期范围实时更新</p></div>
            <button type="button" onClick={() => onOpenRepairList('')}>查看工单</button>
          </div>
          <div className="dashboard-insight-body">
            <div className="trend-chart-wrap"><LineChart values={trend.values} labels={trend.labels} /></div>
            <div className="insight-breakdown">
              <div className="breakdown-block">
                <span>维修状态</span><strong>{filteredOrders.length}<small> 台</small></strong>
                <div className="status-progress" aria-label="维修状态分布">
                  <i className="repairing" style={{ flex: repairingOrders.length || 0.01 }} />
                  <i className="completed" style={{ flex: completedOrders.length || 0.01 }} />
                  <i className="pending" style={{ flex: pendingSettlementOrders.length || 0.01 }} />
                  <i className="settled" style={{ flex: settledOrders.length || 0.01 }} />
                </div>
                <p><span><i className="dot blue" />在修 {repairingOrders.length}</span><span><i className="dot green" />完工 {completedOrders.length}</span><span><i className="dot orange" />待结 {pendingSettlementOrders.length}</span><span><i className="dot gray" />结算 {settledOrders.length}</span></p>
              </div>
              <div className="breakdown-block cost">
                <span>费用结构</span><strong>{formatMoney(costTotal)}</strong>
                <div className="cost-progress"><i style={{ width: `${laborPercent}%` }} /></div>
                <p><span>工时费 {laborPercent}%</span><span>材料费 {materialPercent}%</span></p>
              </div>
            </div>
          </div>
        </section>

        <section className="todo-panel">
          <div className="panel-header">
            <div className="panel-title-copy"><h2>优先待办</h2><p>按业务风险排序</p></div>
            <span className="todo-count">{pendingSettlementOrders.length + urgentPolicies.length + staleOrders.length} 项</span>
          </div>
          <div className="todo-list">
            {todoItems.map((item) => (
              <button key={item.title} type="button" className={`todo-item ${item.tone}`} onClick={item.action}>
                <i /><div><strong>{item.title}</strong><p>{item.detail}</p></div><b>{item.value}</b>
              </button>
            ))}
          </div>
          {pendingSettlementOrders[0] ? (
            <button type="button" className="todo-featured" onClick={() => onViewOrder(pendingSettlementOrders[0])}>
              <span>下一笔待结算</span><strong>{pendingSettlementOrders[0].plate} · {pendingSettlementOrders[0].customer}</strong><em>{formatMoney(pendingSettlementOrders[0].amount)}</em>
            </button>
          ) : null}
        </section>
      </div>

      <section className="status-section">
        <div className="panel-header">
          <div className="panel-title-copy"><h2>维修状态</h2><p>点击状态查看对应工单</p></div>
          <button type="button" onClick={() => onOpenRepairList('')}>全部工单</button>
        </div>
        <div className="status-strip">
          <StatusSummaryCard tone="blue" label="在修" orders={repairingOrders} onClick={() => onOpenRepairList(REPAIR_STATUS.repairing)} />
          <StatusSummaryCard tone="green" label="完工" orders={completedOrders} onClick={() => onOpenRepairList(REPAIR_STATUS.completed)} />
          <StatusSummaryCard tone="orange" label="待结算" orders={pendingSettlementOrders} onClick={() => onOpenRepairList(REPAIR_STATUS.pendingSettlement)} />
          <StatusSummaryCard tone="gray" label="已结算" orders={settledOrders} onClick={() => onOpenRepairList(REPAIR_STATUS.settled)} />
        </div>
      </section>

      <div className="workbench-bottom-row">
        <RecentOrders orders={filteredOrders} onRefreshOrders={onRefreshOrders} onViewOrder={onViewOrder} />
        <InsuranceReminder policies={urgentPolicies} onViewInsurance={onViewInsurance} />
      </div>
    </section>
  );
}

function Metric({ icon, title, value, trend, tone, onClick, variant = 'default' }) {
  const workbenchIcon = workbenchIconMap[icon];
  const iconNode = workbenchIcon ? <WorkbenchIcon name={workbenchIcon} /> : <AssetIcon name={metricIconMap[icon]} />;
  const iconClassName = `metric-icon ${tone} ${workbenchIcon ? 'workbench' : 'legacy'}`;
  const dashboardContent = <><div className="metric-card-header"><span className={iconClassName}>{iconNode}</span><p>{title}</p></div><strong>{value}</strong><small>{trend}<b>→</b></small></>;
  const defaultContent = <><span className={iconClassName}>{iconNode}</span><div><p>{title}</p><strong>{value}</strong><small>{trend}</small></div></>;
  const content = variant === 'dashboard' ? dashboardContent : defaultContent;
  const className = `metric-card ${variant === 'dashboard' ? `dashboard-metric ${tone}` : ''}`.trim();
  return onClick
    ? <button type="button" className={`${className} metric-button`} onClick={onClick}>{content}</button>
    : <article className={className}>{content}</article>;
}

function StatusSummaryCard({ tone, label, orders, onClick }) {
  const latest = orders[0];
  return (
    <button type="button" className={`status-summary-card ${tone}`} onClick={onClick}>
      <span className="status-summary-top"><i />{label}<b>{orders.length}</b></span>
      {latest ? <span className="status-summary-order"><strong>{latest.plate}</strong><small>{latest.customer} · {latest.car}</small></span> : <span className="status-summary-empty">暂无相关工单</span>}
      <span className="status-summary-link">查看列表 <b>→</b></span>
    </button>
  );
}

function PanelHeader({ title, action, icon }) {
  return (
    <div className="panel-header">
      <h2>{icon ? <WorkbenchIcon name={icon} /> : null}{title}</h2>
      {action ? <button>{action}</button> : null}
    </div>
  );
}

function LineChart({ values, labels }) {
  const width = 520;
  const height = 156;
  const max = Math.max(1, ...values);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / max) * (height - 18) - 8;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="本月产值趋势折线图">
        <g className="grid-lines">
          <line x1="0" y1="20" x2={width} y2="20" />
          <line x1="0" y1="58" x2={width} y2="58" />
          <line x1="0" y1="96" x2={width} y2="96" />
          <line x1="0" y1="134" x2={width} y2="134" />
        </g>
        <polyline points={points} fill="none" stroke="#0875de" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((value, index) => {
          const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
          const y = height - (value / max) * (height - 18) - 8;
          return <circle key={index} cx={x} cy={y} r="3.6" fill="#0875de" stroke="#fff" strokeWidth="2" />;
        })}
      </svg>
      <div className="chart-axis">{labels.map((label) => <span key={label}>{label}</span>)}</div>
    </div>
  );
}

function InsuranceReminder({ policies, onViewInsurance }) {
  return (
    <section className="chart-panel reminder-panel">
      <PanelHeader title="保险到期提醒" action={`需跟进 ${policies.length} 台`} />
      <div className="reminder-list">
        {policies.length === 0 ? (
          <div className="reminder-empty">暂无临近到期保险</div>
        ) : null}
        {policies.map((policy) => {
          const remainingDays = daysUntilExpiry(policy.expiry);
          const remainingText = remainingDays < 0 ? `已过期${Math.abs(remainingDays)}天` : `剩余${remainingDays}天`;
          return (
          <article key={policy.id} className="reminder-row">
            <div>
              <b>{policy.plate}　{policy.car}</b>
              <p>{policy.customer}　{policy.phone}</p>
              <p>保险公司：{policy.insurer}</p>
              <p>保险到期：{policy.expiry} <em>（{remainingText}）</em></p>
            </div>
            <button type="button" onClick={() => onViewInsurance(policy)}>查看</button>
          </article>
          );
        })}
      </div>
    </section>
  );
}

function RecentOrders({ orders, onRefreshOrders, onViewOrder }) {
  const [status, setStatus] = useState('全部状态');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const visibleOrders = useMemo(
    () => (status === '全部状态' ? orders : orders.filter((order) => order.status === status)),
    [orders, status],
  );
  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = visibleOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [status, pageSize, orders.length]);

  return (
    <section className="table-panel recent-orders">
      <div className="table-titlebar">
        <h2>最近维修工单</h2>
        <div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="最近工单状态筛选">
            <option>全部状态</option>
            {statusOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <button onClick={onRefreshOrders}>⟳ 刷新</button>
        </div>
      </div>
      <OrderTable orders={pageOrders} onSelect={onViewOrder} />
      <footer className="table-footer">
        <span>共 {visibleOrders.length} 条</span>
        <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} aria-label="每页条数">
          <option value={10}>10条/页</option>
          <option value={20}>20条/页</option>
          <option value={50}>50条/页</option>
        </select>
        <div className="pagination">
          <button disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button key={pageNumber} className={currentPage === pageNumber ? 'active' : ''} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
          ))}
          <button disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button>
        </div>
      </footer>
    </section>
  );
}

function createOrderDraft(order) {
  if (order) {
    return {
      id: order.id,
      date: order.date,
      time: order.time,
      plate: order.plate,
      customer: order.customer,
      phone: order.phone,
      car: order.car,
      insurer: order.insurer,
      insuranceExpiry: order.insuranceExpiry || '',
      type: order.type,
      status: order.status,
      labor: String(order.labor),
      material: String(order.material),
      record: order.record,
      staff: order.staff,
      delivery: order.delivery,
      vin: order.vin || '',
      claimNo: order.claimNo || '',
      accidentType: order.accidentType || accidentTypeOptions[0],
      paymentMethod: order.paymentMethod || '待确认',
      settlementDate: order.settlementDate || '',
      settlementTime: order.settlementTime || '',
      settlementRemark: order.settlementRemark || '',
      settlementReceiptKey: order.settlementReceiptKey || '',
      settlementReceiptName: order.settlementReceiptName || '',
      settlementReceiptType: order.settlementReceiptType || '',
      settlementReceiptSize: order.settlementReceiptSize || 0,
      settlementReceiptUploadedAt: order.settlementReceiptUploadedAt || '',
      remark: order.remark || '',
    };
  }

  const now = new Date();
  const serial = String(now.getTime()).slice(-5);
  const current = todayDateTimeParts();
  return {
    id: `RO202607${serial}`,
    date: current.date.slice(5),
    time: current.time,
    plate: '',
    customer: '',
    phone: '',
    car: '',
    insurer: '人保财险',
    insuranceExpiry: '',
    type: '标的车',
    status: '在修中',
    labor: '0',
    material: '0',
    record: '',
    staff: '张工',
    delivery: '待确认',
    vin: '',
    claimNo: '',
    accidentType: accidentTypeOptions[0],
    paymentMethod: '待确认',
    settlementDate: '',
    settlementTime: '',
    settlementRemark: '',
    settlementReceiptKey: '',
    settlementReceiptName: '',
    settlementReceiptType: '',
    settlementReceiptSize: 0,
    settlementReceiptUploadedAt: '',
    remark: '',
  };
}

function normalizeMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function draftToOrder(draft) {
  const labor = normalizeMoney(draft.labor);
  const material = normalizeMoney(draft.material);
  return {
    ...draft,
    labor,
    material,
    amount: labor + material,
    plate: draft.plate.trim(),
    customer: draft.customer.trim(),
    phone: draft.phone.trim(),
    car: draft.car.trim(),
    insuranceExpiry: draft.insuranceExpiry || '',
    record: draft.record.trim(),
    vin: draft.vin.trim(),
    claimNo: draft.claimNo.trim(),
    settlementRemark: draft.settlementRemark?.trim() || '',
    remark: draft.remark.trim(),
  };
}

const historyInitialFilters = {
  startDate: '',
  endDate: '',
  plate: '',
  customer: '',
  phone: '',
  status: '',
  insurer: '',
  type: '',
};

const statusOptions = ['在修中', '已完工', '待结算', '已结算'];
const REPAIR_STATUS = {
  repairing: statusOptions[0],
  completed: statusOptions[1],
  pendingSettlement: statusOptions[2],
  settled: statusOptions[3],
};
const vehicleTypeOptions = ['标的车', '三者车'];
const accidentTypeOptions = ['喷漆维修（无换件）', '钣喷维修（有换件）', '机电维修保养', '数据修复'];

function todayDateTimeParts() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: now.toTimeString().slice(0, 5),
  };
}

function createSettlementDraft(order) {
  const current = todayDateTimeParts();
  return {
    paymentMethod: order?.paymentMethod && order.paymentMethod !== '待确认' ? order.paymentMethod : '微信',
    settlementDate: order?.settlementDate || current.date,
    settlementTime: order?.settlementTime || current.time,
    settlementRemark: order?.settlementRemark || '',
    settlementReceiptKey: order?.settlementReceiptKey || '',
    settlementReceiptName: order?.settlementReceiptName || '',
    settlementReceiptType: order?.settlementReceiptType || '',
    settlementReceiptSize: order?.settlementReceiptSize || 0,
    settlementReceiptUploadedAt: order?.settlementReceiptUploadedAt || '',
  };
}

function settleOrder(order, settlementDraft) {
  return {
    ...order,
    status: REPAIR_STATUS.settled,
    paymentMethod: settlementDraft.paymentMethod,
    settlementDate: settlementDraft.settlementDate,
    settlementTime: settlementDraft.settlementTime,
    settlementRemark: settlementDraft.settlementRemark.trim(),
    settlementReceiptKey: settlementDraft.settlementReceiptKey || '',
    settlementReceiptName: settlementDraft.settlementReceiptName || '',
    settlementReceiptType: settlementDraft.settlementReceiptType || '',
    settlementReceiptSize: settlementDraft.settlementReceiptSize || 0,
    settlementReceiptUploadedAt: settlementDraft.settlementReceiptUploadedAt || '',
  };
}

function normalizeQueryText(value) {
  return String(value || '').trim().toLowerCase();
}

function orderDateValue(orderDate) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(orderDate || ''))) return orderDate;
  return `2026-${orderDate}`;
}

function isOrderUnsettled(order) {
  return order.status !== REPAIR_STATUS.settled;
}

function isOrderStale(order) {
  if (![REPAIR_STATUS.repairing, REPAIR_STATUS.completed].includes(order.status)) return false;
  const orderDate = orderDateValue(order.date);
  return daysBetween(orderDate, currentDateValue()) >= 3;
}

function orderSearchText(order) {
  return [order.id, order.plate, order.customer, order.phone, order.status, order.insurer, order.car, order.staff, order.record]
    .filter(Boolean)
    .join(' ');
}

function dashboardTrend(orders, dateRange) {
  const start = dateRange.start || currentDateValue().slice(0, 8) + '01';
  const end = dateRange.end || currentDateValue();
  const totalDays = Math.max(0, Math.min(30, daysBetween(start, end)));
  const dates = Array.from({ length: totalDays + 1 }, (_, index) => {
    const date = new Date(`${start}T00:00:00`);
    date.setDate(date.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const values = dates.map((date) =>
    orders
      .filter((order) => orderDateValue(order.date) === date)
      .reduce((sum, order) => sum + order.amount, 0),
  );
  const labelIndexes = [0, Math.floor(dates.length / 4), Math.floor(dates.length / 2), Math.floor((dates.length * 3) / 4), dates.length - 1];
  const labels = [...new Set(labelIndexes)].map((index) => dates[index]?.slice(5)).filter(Boolean);
  return { values: values.length ? values : [0], labels: labels.length ? labels : ['今日'] };
}

function matchesTextFilter(source, keyword) {
  const normalizedKeyword = normalizeQueryText(keyword);
  if (!normalizedKeyword) return true;
  return normalizeQueryText(source).includes(normalizedKeyword);
}

function filterHistoryOrders(orders, filters) {
  return orders.filter((order) => {
    const normalizedDate = orderDateValue(order.date);
    return (
      (!filters.startDate || normalizedDate >= filters.startDate) &&
      (!filters.endDate || normalizedDate <= filters.endDate) &&
      matchesTextFilter(order.plate, filters.plate) &&
      matchesTextFilter(order.customer, filters.customer) &&
      matchesTextFilter(order.phone, filters.phone) &&
      (!filters.status || order.status === filters.status) &&
      (!filters.insurer || order.insurer === filters.insurer) &&
      (!filters.type || order.type === filters.type)
    );
  });
}

function HistoryQueryPage({ orders, insurerOptions, onView, onEdit }) {
  const [draftFilters, setDraftFilters] = useState(historyInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState(historyInitialFilters);

  const results = useMemo(() => filterHistoryOrders(orders, appliedFilters), [orders, appliedFilters]);
  const settledCount = results.filter((order) => order.status === '已结算').length;
  const unsettledCount = results.filter((order) => order.status !== '已结算').length;
  const totalAmount = results.reduce((sum, order) => sum + order.amount, 0);

  function updateFilter(field, value) {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(historyInitialFilters);
    setAppliedFilters(historyInitialFilters);
  }

  return (
    <section className="history-layout">
      <form className="history-filter-panel" onSubmit={applyFilters}>
        <div className="table-titlebar">
          <h2>历史查询</h2>
          <div>
            <button type="button" onClick={resetFilters}>重置</button>
            <button type="submit" className="filter-primary">查询</button>
          </div>
        </div>
        <div className="history-filter-grid">
          <label>
            开始日期
            <input type="date" value={draftFilters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} />
          </label>
          <label>
            结束日期
            <input type="date" value={draftFilters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} />
          </label>
          <label>
            车牌号
            <input value={draftFilters.plate} onChange={(event) => updateFilter('plate', event.target.value)} placeholder="请输入车牌号" />
          </label>
          <label>
            客户名称
            <input value={draftFilters.customer} onChange={(event) => updateFilter('customer', event.target.value)} placeholder="请输入客户名称" />
          </label>
          <label>
            手机号
            <input value={draftFilters.phone} onChange={(event) => updateFilter('phone', event.target.value)} placeholder="请输入手机号" />
          </label>
          <label>
            维修状态
            <select value={draftFilters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">全部</option>
              {statusOptions.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label>
            保险公司
            <select value={draftFilters.insurer} onChange={(event) => updateFilter('insurer', event.target.value)}>
              <option value="">全部</option>
              {insurerOptions.map((insurer) => <option key={insurer}>{insurer}</option>)}
            </select>
          </label>
          <label>
            车辆类型
            <select value={draftFilters.type} onChange={(event) => updateFilter('type', event.target.value)}>
              <option value="">全部</option>
              {vehicleTypeOptions.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
        </div>
      </form>

      <div className="history-summary">
        <Metric icon="order" title="筛选结果" value={`${results.length} 单`} trend="点击查询后更新" tone="blue" />
        <Metric icon="car" title="已结算" value={`${settledCount} 单`} trend="状态统计" tone="green" />
        <Metric icon="shield" title="未结算" value={`${unsettledCount} 单`} trend="含在修/完工/待结算" tone="orange" />
        <Metric icon="yuan" title="合计金额" value={formatMoney(totalAmount)} trend="当前结果合计" tone="blue" />
      </div>

      <section className="table-panel">
        <div className="table-titlebar">
          <h2>查询结果</h2>
          <div>
            <button>全部状态⌄</button>
            <button>刷新</button>
          </div>
        </div>
        <OrderTable orders={results} onView={onView} onEdit={onEdit} />
        <footer className="table-footer">
          <span>共 {results.length} 条</span>
          <button>20条/页⌄</button>
          <div className="pagination"><button>‹</button><button className="active">1</button><button>›</button></div>
        </footer>
      </section>
    </section>
  );
}

function RepairReception({
  orders,
  company,
  createRequest,
  focusRequest,
  onSaveOrder,
  onStatusChange,
  cloudState,
  canSettleOrder,
  canVoidOrder,
  insurerOptions,
  staffOptions,
  onUploadReceipt,
  onViewReceipt,
  onDeleteReceipt,
  onVoidOrder,
}) {
  const [selectedId, setSelectedId] = useState(() => orders[0]?.id || '');
  const [formMode, setFormMode] = useState('view');
  const [draft, setDraft] = useState(() => createOrderDraft(orders[0]));
  const [detailOrder, setDetailOrder] = useState(null);
  const [settlementOrder, setSettlementOrder] = useState(null);
  const [voidOrderTarget, setVoidOrderTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [activeStatus, setActiveStatus] = useState('全部');

  const visibleOrders = useMemo(
    () => (activeStatus === '全部' ? orders : orders.filter((order) => order.status === activeStatus)),
    [activeStatus, orders],
  );

  const statusFilters = useMemo(
    () => ['全部', ...statusOptions].map((status) => ({
      status,
      count: status === '全部' ? orders.length : orders.filter((order) => order.status === status).length,
    })),
    [orders],
  );

  const visibleAmount = visibleOrders.reduce((sum, order) => sum + order.amount, 0);
  const visiblePendingAmount = visibleOrders
    .filter((order) => order.status !== REPAIR_STATUS.settled)
    .reduce((sum, order) => sum + order.amount, 0);

  useEffect(() => {
    if (createRequest > 0) {
      setFormMode('create');
      setDraft(createOrderDraft());
    }
  }, [createRequest]);

  useEffect(() => {
    if (!visibleOrders.some((order) => order.id === selectedId) && visibleOrders[0]) {
      setSelectedId(visibleOrders[0].id);
    }
  }, [selectedId, visibleOrders]);

  const selected = visibleOrders.find((order) => order.id === selectedId) || visibleOrders[0] || orders[0] || null;

  useEffect(() => {
    if (!focusRequest) return;
    const focusedOrder = orders.find((order) => order.id === focusRequest.id);
    if (!focusedOrder) return;
    setActiveStatus('全部');
    setSelectedId(focusedOrder.id);
    setFormMode(focusRequest.mode);
    setDraft(createOrderDraft(focusedOrder));
    if (focusRequest.mode === 'view') {
      setDetailOrder(focusedOrder);
    }
  }, [focusRequest, orders]);

  function openView(order) {
    setSelectedId(order.id);
    setFormMode('view');
    setDraft(createOrderDraft(order));
    setDetailOrder(order);
  }

  function openEdit(order) {
    setSelectedId(order.id);
    setFormMode('edit');
    setDraft(createOrderDraft(order));
    setDetailOrder(null);
  }

  function saveDraft(event) {
    event.preventDefault();
    const nextOrder = draftToOrder(draft);
    onSaveOrder(nextOrder);
    setSelectedId(nextOrder.id);
    setFormMode('view');
    setDraft(createOrderDraft(nextOrder));
  }

  function applyStatusChange(order, status) {
    if (!order) return;
    if (!canSettleOrder && [REPAIR_STATUS.pendingSettlement, REPAIR_STATUS.settled].includes(status)) return;
    if (status === REPAIR_STATUS.settled) {
      setSettlementOrder(order);
      return;
    }
    const nextOrder = { ...order, status };
    onStatusChange(order.id, status);
    setDraft(createOrderDraft(nextOrder));
    if (detailOrder?.id === order.id) setDetailOrder(nextOrder);
  }

  function requestStatusChange(order, status) {
    if (!order) return;
    const actionText = status === REPAIR_STATUS.repairing
      ? '切为在修'
      : status === REPAIR_STATUS.completed
        ? '切为完工'
        : status === REPAIR_STATUS.pendingSettlement
          ? '切为待结算'
          : '完成结算';
    setConfirmAction({
      title: `确认${actionText}`,
      description: `工单 ${order.id}（${order.plate}）当前状态为“${order.status}”，确认切换为“${status}”？`,
      confirmText: status === REPAIR_STATUS.settled ? '继续结算' : '确认切换',
      onConfirm: () => applyStatusChange(order, status),
    });
  }

  function requestSettlement(order) {
    if (!canSettleOrder || !order) return;
    setConfirmAction({
      title: '确认结算工单',
      description: `工单 ${order.id}（${order.plate}）将进入结算流程，需上传到账回执后完成结算。`,
      confirmText: '进入结算',
      onConfirm: () => setSettlementOrder(order),
    });
  }

  function reverseSettlement(order) {
    if (!canSettleOrder || !order) return;
    const nextOrder = {
      ...order,
      status: REPAIR_STATUS.pendingSettlement,
      paymentMethod: '待确认',
      settlementDate: '',
      settlementTime: '',
      settlementRemark: '',
    };
    onSaveOrder(nextOrder);
    setSelectedId(nextOrder.id);
    setDraft(createOrderDraft(nextOrder));
    setDetailOrder(nextOrder);
  }

  function requestReverseSettlement(order) {
    if (!canSettleOrder || !order) return;
    setConfirmAction({
      title: '确认返结算',
      description: `工单 ${order.id}（${order.plate}）已结算，返结算后会清空结算时间和结算备注，状态改为“待结算”。`,
      confirmText: '确认返结算',
      danger: true,
      onConfirm: () => reverseSettlement(order),
    });
  }

  function printOrder(order) {
    setDetailOrder(order);
    window.setTimeout(() => window.print(), 180);
  }

  function completeSettlement(settlementDraft) {
    if (!settlementOrder) return;
    const nextOrder = settleOrder(settlementOrder, settlementDraft);
    onSaveOrder(nextOrder);
    setSelectedId(nextOrder.id);
    setDraft(createOrderDraft(nextOrder));
    setDetailOrder(nextOrder);
    setSettlementOrder(null);
  }

  return (
    <>
      <section className="split-view">
        <div className="table-panel">
          <div className="table-titlebar">
            <h2>维修接待工单</h2>
            <div>
              <button onClick={() => {
                setFormMode('create');
                setDetailOrder(null);
                setDraft(createOrderDraft());
              }}
              >
                新增工单
              </button>
              <button>批量导出</button>
            </div>
          </div>
          {cloudState?.loading ? <div className="cloud-banner">正在从云端加载维修工单...</div> : null}
          {cloudState?.error ? <div className="cloud-banner error">{cloudState.error}</div> : null}
          <div className="reception-toolbar">
            <div className="quick-filters">
              {statusFilters.map((item) => (
                <button
                  key={item.status}
                  className={activeStatus === item.status ? 'active' : ''}
                  onClick={() => setActiveStatus(item.status)}
                >
                  {item.status} <span>{item.count}</span>
                </button>
              ))}
            </div>
            <div className="reception-summary">
              <div><span>当前台次</span><strong>{visibleOrders.length}</strong></div>
              <div><span>当前产值</span><strong>{formatMoney(visibleAmount)}</strong></div>
              <div><span>未结金额</span><strong>{formatMoney(visiblePendingAmount)}</strong></div>
            </div>
          </div>
          <OrderTable
            orders={visibleOrders}
            selectedId={selected?.id}
            onSelect={(order) => {
              setSelectedId(order.id);
              setFormMode('view');
              setDraft(createOrderDraft(order));
              setDetailOrder(null);
            }}
            onView={openView}
            onEdit={openEdit}
            onPrint={printOrder}
            onSettle={canSettleOrder ? requestSettlement : null}
            onVoid={canVoidOrder ? (order) => setVoidOrderTarget(order) : null}
          />
        </div>
        <aside className="detail-panel">
          {formMode === 'view' && selected ? (
            <>
              <div className="detail-heading">
                <span className={`status-chip ${statusClass(selected.status)}`}>{selected.status}</span>
                <h2>{selected.plate}</h2>
                <p>{selected.customer} · {selected.phone}</p>
              </div>
              <dl>
                <div><dt>工单号</dt><dd>{selected.id}</dd></div>
                <div><dt>进厂时间</dt><dd>{selected.date} {selected.time}</dd></div>
                <div><dt>车型</dt><dd>{selected.car}</dd></div>
                <div><dt>车架号</dt><dd>{selected.vin || '未填写'}</dd></div>
                <div><dt>保险公司</dt><dd>{selected.insurer}</dd></div>
                <div><dt>保险到期日</dt><dd>{selected.insuranceExpiry || '未填写'}</dd></div>
                <div><dt>车辆类型</dt><dd>{selected.type}</dd></div>
                <div><dt>案件号</dt><dd>{selected.claimNo || '未填写'}</dd></div>
                <div><dt>事故类型</dt><dd>{selected.accidentType || '常规维修'}</dd></div>
                <div><dt>付款方式</dt><dd>{selected.paymentMethod || '待确认'}</dd></div>
                <div><dt>结算时间</dt><dd>{selected.settlementDate ? `${selected.settlementDate} ${selected.settlementTime || ''}` : '未结算'}</dd></div>
                <div><dt>维修项目</dt><dd>{selected.record}</dd></div>
                <div><dt>接待备注</dt><dd>{selected.remark || '暂无备注'}</dd></div>
                <div><dt>结算备注</dt><dd>{selected.settlementRemark || '暂无备注'}</dd></div>
              </dl>
              <div className="fee-list">
                <div><span>工时费</span><strong>{formatMoney(selected.labor)}</strong></div>
                <div><span>材料费</span><strong>{formatMoney(selected.material)}</strong></div>
                <div className="total"><span>工单金额</span><strong>{formatMoney(selected.amount)}</strong></div>
              </div>
              <div className="state-actions">
                <button onClick={() => requestStatusChange(selected, REPAIR_STATUS.repairing)}>切为在修</button>
                <button onClick={() => requestStatusChange(selected, REPAIR_STATUS.completed)}>切为完工</button>
                {canSettleOrder ? <button onClick={() => requestStatusChange(selected, REPAIR_STATUS.pendingSettlement)}>待结算</button> : null}
                {canSettleOrder && selected.status !== REPAIR_STATUS.settled ? <button onClick={() => requestSettlement(selected)}>完成结算</button> : null}
                {canSettleOrder && selected.status === REPAIR_STATUS.settled ? <button onClick={() => requestReverseSettlement(selected)}>返结算</button> : null}
              </div>
              <button className="wide-edit-button" onClick={() => openEdit(selected)}>编辑当前工单</button>
            </>
          ) : (
            <OrderForm
              draft={draft}
              mode={formMode}
              canSettleOrder={canSettleOrder}
              insurerOptions={insurerOptions}
              staffOptions={staffOptions}
              onChange={setDraft}
              onCancel={() => {
                setFormMode('view');
                setDraft(createOrderDraft(selected));
              }}
              onSubmit={saveDraft}
            />
          )}
        </aside>
      </section>

      {detailOrder ? (
        <OrderDetailDialog
          order={detailOrder}
          company={company}
          onClose={() => setDetailOrder(null)}
          onEdit={() => openEdit(detailOrder)}
          onPrint={() => printOrder(detailOrder)}
          onSettle={canSettleOrder ? () => requestSettlement(detailOrder) : null}
          onReverseSettle={canSettleOrder ? () => requestReverseSettlement(detailOrder) : null}
          onUploadReceipt={(file, order) => onUploadReceipt(file, order.id).then((receipt) => {
            const nextOrder = {
              ...order,
              settlementReceiptKey: receipt.key,
              settlementReceiptName: receipt.name,
              settlementReceiptType: receipt.type,
              settlementReceiptSize: receipt.size,
              settlementReceiptUploadedAt: receipt.uploadedAt,
            };
            onSaveOrder(nextOrder);
            setDetailOrder(nextOrder);
            setDraft(createOrderDraft(nextOrder));
            return nextOrder;
          })}
          onViewReceipt={onViewReceipt}
          onDeleteReceipt={(order) => onDeleteReceipt(order).then((nextOrder) => {
            setDetailOrder(nextOrder);
            setDraft(createOrderDraft(nextOrder));
          })}
          onVoid={canVoidOrder ? () => setVoidOrderTarget(detailOrder) : null}
        />
      ) : null}
      {confirmAction ? (
        <ConfirmActionDialog
          action={confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
        />
      ) : null}
      {settlementOrder ? (
        <SettlementDialog
          order={settlementOrder}
          onClose={() => setSettlementOrder(null)}
          onUploadReceipt={onUploadReceipt}
          onSubmit={completeSettlement}
        />
      ) : null}
      {voidOrderTarget ? (
        <VoidOrderDialog
          order={voidOrderTarget}
          onClose={() => setVoidOrderTarget(null)}
          onSubmit={(reason) => {
            onVoidOrder(voidOrderTarget.id, reason);
            setDetailOrder(null);
            setVoidOrderTarget(null);
          }}
        />
      ) : null}
    </>
  );
}

function PrintField({ label, value, wide = false }) {
  return (
    <div className={wide ? 'print-field print-field-wide' : 'print-field'}>
      <span>{label}</span>
      <strong>{value || '未填写'}</strong>
    </div>
  );
}

function ConfirmActionDialog({ action, onClose, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <span className={action.danger ? 'confirm-icon danger' : 'confirm-icon'}>{action.danger ? '!' : '✓'}</span>
          <div>
            <h2 id="confirm-title">{action.title}</h2>
            <p>{action.description}</p>
          </div>
        </header>
        <footer className="modal-actions">
          <button type="button" onClick={onClose}>取消</button>
          <button type="button" className={action.danger ? 'danger-primary' : ''} onClick={onConfirm}>{action.confirmText || '确认'}</button>
        </footer>
      </section>
    </div>
  );
}

function OrderDetailDialog({ order, company, onClose, onEdit, onPrint, onSettle, onReverseSettle, onUploadReceipt, onViewReceipt, onDeleteReceipt, onVoid }) {
  const [receiptState, setReceiptState] = useState({ loading: false, error: '', previewUrl: '' });
  const [receiptFile, setReceiptFile] = useState(null);
  const printTime = new Date().toLocaleString('zh-CN', { hour12: false });
  const settlementText = order.settlementDate ? `${order.settlementDate} ${order.settlementTime || ''}` : '未结算';
  const hasReceipt = Boolean(order.settlementReceiptKey);

  useEffect(() => () => {
    if (receiptState.previewUrl) URL.revokeObjectURL(receiptState.previewUrl);
  }, [receiptState.previewUrl]);

  function viewReceipt() {
    if (!hasReceipt || receiptState.loading) return;
    setReceiptState((current) => ({ ...current, loading: true, error: '' }));
    onViewReceipt(order.settlementReceiptKey)
      .then((blob) => {
        if (receiptState.previewUrl) URL.revokeObjectURL(receiptState.previewUrl);
        setReceiptState({ loading: false, error: '', previewUrl: URL.createObjectURL(blob) });
      })
      .catch((error) => setReceiptState({ loading: false, error: error.message || '回执读取失败', previewUrl: '' }));
  }

  function deleteReceipt() {
    if (!hasReceipt || receiptState.loading) return;
    setReceiptState((current) => ({ ...current, loading: true, error: '' }));
    onDeleteReceipt(order)
      .then(() => {
        if (receiptState.previewUrl) URL.revokeObjectURL(receiptState.previewUrl);
        setReceiptState({ loading: false, error: '', previewUrl: '' });
      })
      .catch((error) => setReceiptState((current) => ({ ...current, loading: false, error: error.message || '回执删除失败' })));
  }

  function uploadReceipt() {
    if (!receiptFile || receiptState.loading) {
      setReceiptState((current) => ({ ...current, error: '请先选择到账回执截图' }));
      return;
    }
    setReceiptState((current) => ({ ...current, loading: true, error: '' }));
    onUploadReceipt(receiptFile, order)
      .then(() => {
        setReceiptFile(null);
        setReceiptState({ loading: false, error: '', previewUrl: '' });
      })
      .catch((error) => setReceiptState((current) => ({ ...current, loading: false, error: error.message || '回执上传失败' })));
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title" onClick={(event) => event.stopPropagation()}>
        <div className="screen-order-detail">
          <header className="modal-heading">
            <div>
              <span className={`status-chip ${statusClass(order.status)}`}>{order.status}</span>
              <h2 id="order-detail-title">{order.plate} 工单详情</h2>
              <p>{order.id} · {order.date} {order.time}</p>
            </div>
            <button type="button" aria-label="关闭详情" onClick={onClose}>×</button>
          </header>

          <div className="modal-summary-strip">
            <div><span>客户</span><strong>{order.customer}</strong></div>
            <div><span>手机号</span><strong>{order.phone}</strong></div>
            <div><span>业务员</span><strong>{order.staff}</strong></div>
            <div><span>金额</span><strong>{formatMoney(order.amount)}</strong></div>
          </div>

          <div className="modal-detail-grid">
            <div><dt>车型</dt><dd>{order.car}</dd></div>
            <div><dt>车架号</dt><dd>{order.vin || '未填写'}</dd></div>
            <div><dt>保险公司</dt><dd>{order.insurer}</dd></div>
            <div><dt>保险到期日</dt><dd>{order.insuranceExpiry || '未填写'}</dd></div>
            <div><dt>车辆类型</dt><dd>{order.type}</dd></div>
            <div><dt>案件号</dt><dd>{order.claimNo || '未填写'}</dd></div>
            <div><dt>事故类型</dt><dd>{order.accidentType || '常规维修'}</dd></div>
            <div><dt>付款方式</dt><dd>{order.paymentMethod || '待确认'}</dd></div>
            <div><dt>预计交车</dt><dd>{order.delivery}</dd></div>
            <div><dt>结算时间</dt><dd>{settlementText}</dd></div>
            <div><dt>结算备注</dt><dd>{order.settlementRemark || '暂无备注'}</dd></div>
            <div><dt>到账回执</dt><dd>{hasReceipt ? order.settlementReceiptName || '已上传回执' : '未上传'}</dd></div>
            <div><dt>工时费</dt><dd>{formatMoney(order.labor)}</dd></div>
            <div><dt>材料费</dt><dd>{formatMoney(order.material)}</dd></div>
            <div className="modal-wide"><dt>维修项目</dt><dd>{order.record}</dd></div>
            <div className="modal-wide"><dt>接待备注</dt><dd>{order.remark || '暂无备注'}</dd></div>
          </div>

          {hasReceipt ? (
            <section className="receipt-panel">
              <div>
                <strong>到账回执</strong>
                <span>{order.settlementReceiptName || '已上传回执'} · {order.settlementReceiptUploadedAt ? new Date(order.settlementReceiptUploadedAt).toLocaleString('zh-CN', { hour12: false }) : '上传时间未记录'}</span>
              </div>
              <div>
                <button type="button" onClick={viewReceipt} disabled={receiptState.loading}>{receiptState.loading ? '处理中...' : '查看回执'}</button>
                <button type="button" className="danger" onClick={deleteReceipt} disabled={receiptState.loading}>删除回执</button>
              </div>
              {receiptState.error ? <p className="form-error">{receiptState.error}</p> : null}
              {receiptState.previewUrl ? <img src={receiptState.previewUrl} alt="到账回执截图" /> : null}
            </section>
          ) : (
            <section className="receipt-panel">
              <div>
                <strong>补传到账回执</strong>
                <span>{order.status === REPAIR_STATUS.settled ? '该工单已结算，可在这里补传回执截图。' : '可先补传回执，也可以在结算时上传。'}</span>
              </div>
              <label className="receipt-upload-field">
                到账回执截图
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    setReceiptFile(event.target.files?.[0] || null);
                    setReceiptState((current) => ({ ...current, error: '' }));
                  }}
                />
                <span>{receiptFile ? receiptFile.name : '请选择 JPG、PNG 或 WEBP 图片'}</span>
              </label>
              <div>
                <button type="button" onClick={uploadReceipt} disabled={receiptState.loading}>{receiptState.loading ? '上传中...' : '上传回执'}</button>
              </div>
              {receiptState.error ? <p className="form-error">{receiptState.error}</p> : null}
            </section>
          )}

          <footer className="modal-actions">
            <button type="button" onClick={onPrint}>打印工单</button>
            {onSettle && order.status !== REPAIR_STATUS.settled ? <button type="button" onClick={onSettle}>结算工单</button> : null}
            {onReverseSettle && order.status === REPAIR_STATUS.settled ? <button type="button" onClick={onReverseSettle}>返结算</button> : null}
            {onVoid ? <button type="button" onClick={onVoid}>作废工单</button> : null}
            <button type="button" onClick={onEdit}>编辑工单</button>
          </footer>
        </div>

        <section className="print-order-sheet" aria-hidden="true">
          <header className="print-sheet-header">
            <div className="print-sheet-title">
              <h1>{company?.fullName || '汽车服务有限公司'}</h1>
            </div>
            <div className="print-sheet-meta">
              <span>工单号：{order.id}</span>
              <span>打印时间：{printTime}</span>
            </div>
          </header>

          <div className="print-status-row">
            <div><span>维修状态</span><strong>{order.status}</strong></div>
            <div><span>进厂时间</span><strong>{order.date} {order.time}</strong></div>
            <div><span>预计交车</span><strong>{order.delivery || '未填写'}</strong></div>
            <div><span>业务员</span><strong>{order.staff || '未填写'}</strong></div>
          </div>

          <div className="print-section">
            <h2>客户与车辆信息</h2>
            <div className="print-field-grid">
              <PrintField label="客户姓名" value={order.customer} />
              <PrintField label="联系电话" value={order.phone} />
              <PrintField label="车牌号" value={order.plate} />
              <PrintField label="车型" value={order.car} />
              <PrintField label="车架号" value={order.vin} wide />
            </div>
          </div>

          <div className="print-section">
            <h2>保险与事故信息</h2>
            <div className="print-field-grid">
              <PrintField label="保险公司" value={order.insurer} />
              <PrintField label="保险到期日" value={order.insuranceExpiry} />
              <PrintField label="车辆类型" value={order.type} />
              <PrintField label="案件号" value={order.claimNo} />
              <PrintField label="事故类型" value={order.accidentType || '常规维修'} wide />
            </div>
          </div>

          <div className="print-section">
            <h2>维修内容</h2>
            <div className="print-textbox">{order.record || '未填写'}</div>
            <div className="print-note-grid">
              <PrintField label="接待备注" value={order.remark || '暂无备注'} />
              <PrintField label="结算备注" value={order.settlementRemark || '暂无备注'} />
            </div>
          </div>

          <div className="print-section">
            <h2>费用与结算</h2>
            <div className="print-cost-grid">
              <div><span>工时费</span><strong>{formatMoney(order.labor)}</strong></div>
              <div><span>材料费</span><strong>{formatMoney(order.material)}</strong></div>
              <div><span>付款方式</span><strong>{order.paymentMethod || '待确认'}</strong></div>
              <div><span>结算时间</span><strong>{settlementText}</strong></div>
              <div className="print-total"><span>工单金额</span><strong>{formatMoney(order.amount)}</strong></div>
            </div>
            <div className="print-receipt-line">到账回执：{hasReceipt ? order.settlementReceiptName || '已上传' : '未上传'}</div>
          </div>

          <footer className="print-signatures">
            <div><span>客户确认签字</span></div>
            <div><span>接待人员签字</span></div>
            <div><span>结算确认签字</span></div>
          </footer>
        </section>
      </section>
    </div>
  );
}

function VoidOrderDialog({ order, onClose, onSubmit }) {
  const [reason, setReason] = useState('');

  function submitVoid(event) {
    event.preventDefault();
    onSubmit(reason);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form className="settlement-modal" role="dialog" aria-modal="true" aria-labelledby="void-title" onClick={(event) => event.stopPropagation()} onSubmit={submitVoid}>
        <header className="modal-heading">
          <div>
            <span className={`status-chip ${statusClass(order.status)}`}>{order.status}</span>
            <h2 id="void-title">作废工单</h2>
            <p>{order.id} · {order.plate} · {order.customer}</p>
          </div>
          <button type="button" aria-label="关闭作废" onClick={onClose}>×</button>
        </header>
        <div className="cloud-banner error">作废后工单不会显示在日常列表中，但云端仍保留记录用于追溯。</div>
        <div className="form-grid">
          <label className="full-field">
            作废原因
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="例如：录入重复、客户取消维修、工单建错" />
          </label>
        </div>
        <footer className="modal-actions">
          <button type="button" onClick={onClose}>取消</button>
          <button type="submit">确认作废</button>
        </footer>
      </form>
    </div>
  );
}

function SettlementDialog({ order, onClose, onUploadReceipt, onSubmit }) {
  const [draft, setDraft] = useState(() => createSettlementDraft(order));
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadState, setUploadState] = useState({ loading: false, error: '' });
  const hasExistingReceipt = Boolean(draft.settlementReceiptKey);

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submitSettlement(event) {
    event.preventDefault();
    setUploadState({ loading: true, error: '' });
    const uploadPromise = receiptFile
      ? onUploadReceipt(receiptFile, order.id)
      : hasExistingReceipt
        ? Promise.resolve({
          key: draft.settlementReceiptKey,
          name: draft.settlementReceiptName,
          type: draft.settlementReceiptType,
          size: draft.settlementReceiptSize,
          uploadedAt: draft.settlementReceiptUploadedAt,
        })
        : Promise.reject(new Error('请先上传到账回执截图'));

    uploadPromise
      .then((receipt) => {
        onSubmit({
          ...draft,
          settlementReceiptKey: receipt.key,
          settlementReceiptName: receipt.name,
          settlementReceiptType: receipt.type,
          settlementReceiptSize: receipt.size,
          settlementReceiptUploadedAt: receipt.uploadedAt,
        });
      })
      .catch((error) => setUploadState({ loading: false, error: error.message || '回执上传失败' }));
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form className="settlement-modal" role="dialog" aria-modal="true" aria-labelledby="settlement-title" onClick={(event) => event.stopPropagation()} onSubmit={submitSettlement}>
        <header className="modal-heading">
          <div>
            <span className={`status-chip ${statusClass(order.status)}`}>{order.status}</span>
            <h2 id="settlement-title">工单结算</h2>
            <p>{order.id} · {order.plate} · {order.customer}</p>
          </div>
          <button type="button" aria-label="关闭结算" onClick={onClose}>×</button>
        </header>

        <div className="settlement-total">
          <span>应结金额</span>
          <strong>{formatMoney(order.amount)}</strong>
        </div>

        <div className="form-grid settlement-grid">
          <label>
            付款方式
            <select value={draft.paymentMethod} onChange={(event) => updateField('paymentMethod', event.target.value)}>
              <option>现金</option>
              <option>微信</option>
              <option>支付宝</option>
              <option>保险直赔</option>
              <option>挂账</option>
            </select>
          </label>
          <label>
            结算日期
            <input type="date" required value={draft.settlementDate} onChange={(event) => updateField('settlementDate', event.target.value)} />
          </label>
          <label>
            结算时间
            <input type="time" required value={draft.settlementTime} onChange={(event) => updateField('settlementTime', event.target.value)} />
          </label>
          <label className="full-field">
            结算备注
            <textarea value={draft.settlementRemark} onChange={(event) => updateField('settlementRemark', event.target.value)} placeholder="记录收款说明、优惠、挂账原因或保险直赔备注" />
          </label>
          <label className="full-field receipt-upload-field">
            到账回执截图
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                setReceiptFile(event.target.files?.[0] || null);
                setUploadState({ loading: false, error: '' });
              }}
            />
            <span>{receiptFile ? receiptFile.name : hasExistingReceipt ? `已上传：${draft.settlementReceiptName || '到账回执'}` : '必填，请上传到账回执截图'}</span>
          </label>
        </div>
        {uploadState.error ? <div className="cloud-banner error">{uploadState.error}</div> : null}

        <footer className="modal-actions">
          <button type="button" onClick={onClose}>取消</button>
          <button type="submit" disabled={uploadState.loading}>{uploadState.loading ? '上传并结算中...' : '确认结算'}</button>
        </footer>
      </form>
    </div>
  );
}

function OrderForm({ draft, mode, canSettleOrder, insurerOptions, staffOptions, onChange, onCancel, onSubmit }) {
  const labor = normalizeMoney(draft.labor);
  const material = normalizeMoney(draft.material);
  const visibleInsurerOptions = Array.from(new Set([draft.insurer, ...insurerOptions].filter(Boolean)));
  const visibleStaffOptions = Array.from(new Set([draft.staff, ...staffOptions].filter(Boolean)));
  const employeeStatusOptions = [REPAIR_STATUS.repairing, REPAIR_STATUS.completed];
  const visibleStatusOptions = canSettleOrder
    ? statusOptions
    : Array.from(new Set([draft.status, ...employeeStatusOptions].filter(Boolean)));

  function updateField(field, value) {
    onChange({ ...draft, [field]: value });
  }

  return (
    <form className="order-form" onSubmit={onSubmit}>
      <div className="form-heading">
        <span>{mode === 'create' ? '新增工单' : '编辑工单'}</span>
        <strong>{draft.id}</strong>
      </div>

      <div className="form-grid">
        <label>
          车牌号
          <input required value={draft.plate} onChange={(event) => updateField('plate', event.target.value)} placeholder="必填，请输入车牌号" />
        </label>
        <label>
          客户名称
          <input required value={draft.customer} onChange={(event) => updateField('customer', event.target.value)} placeholder="必填，请输入客户名称" />
        </label>
        <label>
          手机号
          <input required value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="必填，请输入手机号" />
        </label>
        <label>
          车型
          <input required value={draft.car} onChange={(event) => updateField('car', event.target.value)} placeholder="必填，请输入车型" />
        </label>
        <label>
          车架号
          <input value={draft.vin} onChange={(event) => updateField('vin', event.target.value)} placeholder="可选，请输入车架号" />
        </label>
        <label>
          保险案件号
          <input value={draft.claimNo} onChange={(event) => updateField('claimNo', event.target.value)} placeholder="可选，请输入保险案件号" />
        </label>
        <label>
          保险公司
          <select value={draft.insurer} onChange={(event) => updateField('insurer', event.target.value)}>
            {visibleInsurerOptions.map((insurer) => <option key={insurer}>{insurer}</option>)}
          </select>
        </label>
        <label>
          保险到期日
          <input required type="date" value={draft.insuranceExpiry} onChange={(event) => updateField('insuranceExpiry', event.target.value)} />
        </label>
        <label>
          车辆类型
          <select value={draft.type} onChange={(event) => updateField('type', event.target.value)}>
            {vehicleTypeOptions.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>
          事故类型
          <select value={draft.accidentType} onChange={(event) => updateField('accidentType', event.target.value)}>
            {accidentTypeOptions.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>
          付款方式
          <select value={draft.paymentMethod} onChange={(event) => updateField('paymentMethod', event.target.value)}>
            <option>待确认</option>
            <option>现金</option>
            <option>微信</option>
            <option>支付宝</option>
            <option>保险直赔</option>
            <option>挂账</option>
          </select>
        </label>
        <label>
          进厂日期
          <input required value={draft.date} readOnly title="新增工单时自动锁定当天日期" />
        </label>
        <label>
          进厂时间
          <input required value={draft.time} onChange={(event) => updateField('time', event.target.value)} placeholder="必填，请输入进厂时间" />
        </label>
        <label>
          工时费
          <input type="number" min="0" value={draft.labor} onChange={(event) => updateField('labor', event.target.value)} />
        </label>
        <label>
          材料费
          <input type="number" min="0" value={draft.material} onChange={(event) => updateField('material', event.target.value)} />
        </label>
        <label>
          维修状态
          <select value={draft.status} onChange={(event) => updateField('status', event.target.value)}>
            {visibleStatusOptions.map((status) => (
              <option key={status} disabled={!canSettleOrder && !employeeStatusOptions.includes(status)}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          业务员
          <select value={draft.staff} onChange={(event) => updateField('staff', event.target.value)}>
            {visibleStaffOptions.map((staff) => <option key={staff}>{staff}</option>)}
          </select>
        </label>
        <label className="full-field">
          维修项目
          <textarea required value={draft.record} onChange={(event) => updateField('record', event.target.value)} placeholder="必填，请输入维修项目、故障描述" />
        </label>
        <label className="full-field">
          预计交车
          <input value={draft.delivery} onChange={(event) => updateField('delivery', event.target.value)} placeholder="可选，请输入预计交车时间" />
        </label>
        <label className="full-field">
          接待备注
          <textarea value={draft.remark} onChange={(event) => updateField('remark', event.target.value)} placeholder="可选，请输入客户要求、定损说明、取车提醒" />
        </label>
      </div>

      <div className="form-total">
        <span>自动合计</span>
        <strong>{formatMoney(labor + material)}</strong>
      </div>
      <div className="form-actions">
        <button type="button" onClick={onCancel}>取消</button>
        <button type="submit">保存工单</button>
      </div>
    </form>
  );
}

function OrderTable({ orders, selectedId, onSelect, onView, onEdit, onPrint, onSettle, onVoid }) {
  function stopAction(event, action) {
    event.stopPropagation();
    action();
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>工单号</th>
            <th>进厂时间</th>
            <th>车牌号</th>
            <th>客户名称</th>
            <th>车型</th>
            <th>维修项目</th>
            <th>工单金额（元）</th>
            <th>维修状态</th>
            <th>预计交车时间</th>
            <th>业务员</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan="11" className="empty-table-cell">暂无匹配工单</td>
            </tr>
          ) : orders.map((order) => (
            <tr
              key={order.id}
              className={`${onSelect ? 'clickable-row' : ''} ${selectedId === order.id ? 'selected-row' : ''}`.trim()}
              onClick={() => onSelect?.(order)}
            >
              <td>{order.id}</td>
              <td>{order.date}　{order.time}</td>
              <td><strong className="plate-link">{order.plate}</strong></td>
              <td>{order.customer}</td>
              <td>{order.car}</td>
              <td>{order.record}</td>
              <td>{formatMoney(order.amount)}</td>
              <td><span className={`status-chip ${statusClass(order.status)}`}>{order.status}</span></td>
              <td>{order.delivery}</td>
              <td>{order.staff}</td>
              <td>
                <span className="table-actions">
                  <button onClick={(event) => stopAction(event, () => onView?.(order))}>查看</button>
                  <button onClick={(event) => stopAction(event, () => onEdit?.(order))}>编辑</button>
                  <button onClick={(event) => stopAction(event, () => onPrint?.(order))}>打印</button>
                  {onSettle && order.status !== REPAIR_STATUS.settled ? (
                    <button onClick={(event) => stopAction(event, () => onSettle?.(order))}>结算</button>
                  ) : null}
                  {order.status === REPAIR_STATUS.settled ? <span className="settled-readonly">已结算</span> : null}
                  {onVoid ? <button onClick={(event) => stopAction(event, () => onVoid(order))}>作废</button> : null}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function createInsuranceDraft(policy) {
  if (policy) {
    return {
      id: policy.id,
      plate: policy.plate,
      customer: policy.customer,
      phone: policy.phone,
      car: policy.car,
      vin: policy.vin,
      insurer: policy.insurer,
      expiry: policy.expiry,
      amount: String(policy.amount),
      type: policy.type,
    };
  }

  return {
    id: `IP${Date.now()}`,
    plate: '',
    customer: '',
    phone: '',
    car: '',
    vin: '',
    insurer: '人保财险',
    expiry: '2026-08-20',
    amount: '0',
    type: '交强险 / 商业险',
  };
}

function draftToInsurancePolicy(draft) {
  return normalizeInsurancePolicy({
    ...draft,
    plate: draft.plate.trim(),
    customer: draft.customer.trim(),
    phone: draft.phone.trim(),
    car: draft.car.trim(),
    vin: draft.vin.trim(),
    type: draft.type.trim(),
    amount: normalizeMoney(draft.amount),
  });
}

function InsuranceLedger({ policies, insurerOptions, onSavePolicy, focusPolicyRequest }) {
  const [activeFilter, setActiveFilter] = useState('7天内到期');
  const [formMode, setFormMode] = useState('create');
  const [draft, setDraft] = useState(createInsuranceDraft);
  const visibleInsurerOptions = useMemo(
    () => Array.from(new Set([draft.insurer, ...insurerOptions].filter(Boolean))),
    [draft.insurer, insurerOptions],
  );

  const filteredPolicies = useMemo(() => {
    if (activeFilter === '全部保险') return policies;
    return policies.filter((policy) => insuranceState(policy) === activeFilter);
  }, [activeFilter, policies]);

  const within7Count = policies.filter((policy) => insuranceState(policy) === '7天内到期').length;
  const within30Count = policies.filter((policy) => insuranceState(policy) === '30天内到期').length;
  const expiredCount = policies.filter((policy) => insuranceState(policy) === '已过期').length;

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function startCreate() {
    setFormMode('create');
    setDraft(createInsuranceDraft());
  }

  function startEdit(policy) {
    setFormMode('edit');
    setDraft(createInsuranceDraft(policy));
  }

  useEffect(() => {
    if (!focusPolicyRequest?.id) return;
    const policy = policies.find((item) => item.id === focusPolicyRequest.id);
    if (!policy) return;
    setActiveFilter('全部保险');
    startEdit(policy);
  }, [focusPolicyRequest, policies]);

  function savePolicy(event) {
    event.preventDefault();
    const nextPolicy = draftToInsurancePolicy(draft);
    onSavePolicy(nextPolicy);
    setFormMode('edit');
    setDraft(createInsuranceDraft(nextPolicy));
  }

  return (
    <section className="insurance-layout">
      <div className="insurance-toolbar">
        <div className="quick-filters">
          {['7天内到期', '30天内到期', '已过期', '全部保险'].map((filter) => (
            <button key={filter} className={activeFilter === filter ? 'active' : ''} onClick={() => setActiveFilter(filter)}>
              {filter}
            </button>
          ))}
        </div>
        <button className="wide-edit-button insurance-add-button" onClick={startCreate}>新增保险</button>
      </div>

      <div className="history-summary">
        <Metric icon="shield" title="7天内到期" value={`${within7Count} 台`} trend="优先跟进" tone="red" />
        <Metric icon="car" title="30天内到期" value={`${within30Count} 台`} trend="续保提醒" tone="orange" />
        <Metric icon="order" title="已过期" value={`${expiredCount} 台`} trend="需立即处理" tone="red" />
        <Metric icon="yuan" title="保险记录" value={`${policies.length} 条`} trend="本地保存" tone="blue" />
      </div>

      <div className="insurance-workspace">
        <div className="insurance-cards">
          {filteredPolicies.map((row) => {
            const state = insuranceState(row);
            return (
              <article key={row.id} className="insurance-card">
                <div>
                  <span className={`expiry-tag ${state === '已过期' ? 'expired' : ''}`}>{state}</span>
                  <h2>{row.plate}</h2>
                  <p>{row.customer} · {row.phone || row.car}</p>
                </div>
                <dl>
                  <div><dt>保险到期日</dt><dd>{row.expiry}</dd></div>
                  <div><dt>保险公司</dt><dd>{row.insurer}</dd></div>
                  <div><dt>上年投保金额</dt><dd>{formatMoney(row.amount)}</dd></div>
                  <div><dt>险种</dt><dd>{row.type}</dd></div>
                  <div><dt>车型</dt><dd>{row.car}</dd></div>
                  <div><dt>车架号</dt><dd>{row.vin}</dd></div>
                </dl>
                <button className="insurance-card-action" onClick={() => startEdit(row)}>编辑保险</button>
              </article>
            );
          })}
        </div>

        <form className="insurance-editor" onSubmit={savePolicy}>
          <div className="form-heading">
            <span>{formMode === 'create' ? '新增保险' : '编辑保险'}</span>
            <strong>{draft.id}</strong>
          </div>
          <div className="form-grid">
            <label>
              车牌号
              <input required value={draft.plate} onChange={(event) => updateField('plate', event.target.value)} placeholder="必填，请输入车牌号" />
            </label>
            <label>
              客户名称
              <input required value={draft.customer} onChange={(event) => updateField('customer', event.target.value)} placeholder="必填，请输入客户名称" />
            </label>
            <label>
              手机号
              <input value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="可选，请输入手机号" />
            </label>
            <label>
              车型
              <input required value={draft.car} onChange={(event) => updateField('car', event.target.value)} placeholder="必填，请输入车型" />
            </label>
            <label>
              车架号
              <input value={draft.vin} onChange={(event) => updateField('vin', event.target.value)} placeholder="可选，请输入车架号" />
            </label>
            <label>
              保险公司
              <select value={draft.insurer} onChange={(event) => updateField('insurer', event.target.value)}>
                {visibleInsurerOptions.map((insurer) => <option key={insurer}>{insurer}</option>)}
              </select>
            </label>
            <label>
              到期日期
              <input required type="date" value={draft.expiry} onChange={(event) => updateField('expiry', event.target.value)} />
            </label>
            <label>
              投保金额
              <input type="number" min="0" value={draft.amount} onChange={(event) => updateField('amount', event.target.value)} />
            </label>
            <label className="full-field">
              险种
              <input required value={draft.type} onChange={(event) => updateField('type', event.target.value)} placeholder="必填，请输入险种" />
            </label>
          </div>
          <div className="form-total">
            <span>到期状态</span>
            <strong>{insuranceState(draftToInsurancePolicy(draft))}</strong>
          </div>
          <div className="form-actions">
            <button type="button" onClick={startCreate}>清空新增</button>
            <button type="submit">保存保险</button>
          </div>
        </form>
      </div>

      {filteredPolicies.length === 0 ? (
        <section className="placeholder-panel">
          <h2>暂无匹配保险</h2>
          <p>当前筛选条件下没有保险记录，可以切换筛选或新增保险。</p>
        </section>
      ) : null}
    </section>
  );
}

function createCustomerVehicleDraft(vehicle) {
  if (vehicle) {
    return {
      id: vehicle.id,
      customer: vehicle.customer,
      phone: vehicle.phone,
      plate: vehicle.plate,
      car: vehicle.car,
      vin: vehicle.vin,
      insurer: vehicle.insurer,
      vehicleType: vehicle.vehicleType,
      source: vehicle.source,
      remark: vehicle.remark,
    };
  }

  return {
    id: `CV${Date.now()}`,
    customer: '',
    phone: '',
    plate: '',
    car: '',
    vin: '',
    insurer: '人保财险',
    vehicleType: '标的车',
    source: '手动录入',
    remark: '',
  };
}

function draftToCustomerVehicle(draft) {
  return normalizeCustomerVehicle({
    ...draft,
    customer: draft.customer.trim(),
    phone: draft.phone.trim(),
    plate: draft.plate.trim(),
    car: draft.car.trim(),
    vin: draft.vin.trim(),
    remark: draft.remark.trim(),
  });
}

function excelCell(value) {
  const text = String(value ?? '');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildExcelWorkbook(sheetName, headers, rows) {
  const headerCells = headers.map((header) => `<th>${excelCell(header.label)}</th>`).join('');
  const bodyRows = rows.map((row) => (
    `<tr>${headers.map((header) => `<td style="mso-number-format:'\\@';">${excelCell(header.value(row))}</td>`).join('')}</tr>`
  )).join('');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; }
    th, td { border: 1px solid #9fb4cc; padding: 6px 10px; font-family: Microsoft YaHei, Arial, sans-serif; }
    th { background: #eaf4ff; font-weight: 700; }
  </style>
</head>
<body>
  <table>
    <caption>${excelCell(sheetName)}</caption>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
}

function downloadExcel(filename, htmlContent) {
  const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function CustomerVehiclesPage({ vehicles, orders, policies, insurerOptions, onSaveVehicle }) {
  const [keyword, setKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState('全部车辆');
  const [formMode, setFormMode] = useState('create');
  const [draft, setDraft] = useState(createCustomerVehicleDraft);
  const visibleInsurerOptions = useMemo(
    () => Array.from(new Set([draft.insurer, ...insurerOptions].filter(Boolean))),
    [draft.insurer, insurerOptions],
  );

  const filteredVehicles = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesKeyword = !normalizedKeyword || [vehicle.customer, vehicle.phone, vehicle.plate, vehicle.car, vehicle.vin]
        .join(' ')
        .toLowerCase()
        .includes(normalizedKeyword);
      const matchesFilter = activeFilter === '全部车辆' || vehicle.vehicleType === activeFilter || vehicle.source === activeFilter;
      return matchesKeyword && matchesFilter;
    });
  }, [activeFilter, keyword, vehicles]);

  const insuredCount = vehicles.filter((vehicle) => policies.some((policy) => policy.plate === vehicle.plate)).length;
  const repairedCount = vehicles.filter((vehicle) => orders.some((order) => order.plate === vehicle.plate)).length;
  const customerCount = new Set(vehicles.map((vehicle) => vehicle.phone || vehicle.customer)).size;

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function startCreate() {
    setFormMode('create');
    setDraft(createCustomerVehicleDraft());
  }

  function startEdit(vehicle) {
    setFormMode('edit');
    setDraft(createCustomerVehicleDraft(vehicle));
  }

  function saveVehicle(event) {
    event.preventDefault();
    const nextVehicle = draftToCustomerVehicle(draft);
    onSaveVehicle(nextVehicle);
    setFormMode('edit');
    setDraft(createCustomerVehicleDraft(nextVehicle));
  }

  function relatedCounts(vehicle) {
    return {
      repairs: orders.filter((order) => order.plate === vehicle.plate).length,
      policies: policies.filter((policy) => policy.plate === vehicle.plate).length,
    };
  }

  return (
    <section className="customer-vehicle-layout">
      <div className="insurance-toolbar">
        <div className="quick-filters">
          {['全部车辆', '标的车', '三者车', '手动录入'].map((filter) => (
            <button key={filter} className={activeFilter === filter ? 'active' : ''} onClick={() => setActiveFilter(filter)}>
              {filter}
            </button>
          ))}
        </div>
        <button className="wide-edit-button insurance-add-button" onClick={startCreate}>新增客户车辆</button>
      </div>

      <div className="history-summary">
        <Metric icon="car" title="车辆档案" value={`${vehicles.length} 台`} trend="本地保存" tone="blue" />
        <Metric icon="order" title="客户数量" value={`${customerCount} 位`} trend="按手机号统计" tone="green" />
        <Metric icon="shield" title="已关联保险" value={`${insuredCount} 台`} trend="按车牌匹配" tone="orange" />
        <Metric icon="yuan" title="有维修记录" value={`${repairedCount} 台`} trend="按车牌匹配" tone="blue" />
      </div>

      <div className="customer-search-panel">
        <AssetIcon name="action-search.png" className="field-icon" />
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索客户 / 手机号 / 车牌 / 车型 / 车架号" />
      </div>

      <div className="customer-vehicle-workspace">
        <div className="customer-vehicle-list">
          {filteredVehicles.map((vehicle) => {
            const counts = relatedCounts(vehicle);
            const policy = policies.find((item) => item.plate === vehicle.plate);
            return (
              <article key={vehicle.id} className="customer-vehicle-card">
                <div className="customer-card-heading">
                  <span className={`status-chip ${vehicle.vehicleType === '标的车' ? 'repairing' : 'pending'}`}>{vehicle.vehicleType}</span>
                  <button onClick={() => startEdit(vehicle)}>编辑</button>
                </div>
                <h2>{vehicle.plate}</h2>
                <p>{vehicle.customer} · {vehicle.phone || '未填写手机号'}</p>
                <dl>
                  <div><dt>车型</dt><dd>{vehicle.car}</dd></div>
                  <div><dt>车架号</dt><dd>{vehicle.vin || '未填写'}</dd></div>
                  <div><dt>保险公司</dt><dd>{vehicle.insurer}</dd></div>
                  <div><dt>来源</dt><dd>{vehicle.source}</dd></div>
                  <div><dt>维修记录</dt><dd>{counts.repairs} 单</dd></div>
                  <div><dt>保险记录</dt><dd>{counts.policies} 条</dd></div>
                  <div><dt>保险到期</dt><dd>{policy ? `${policy.expiry} / ${insuranceState(policy)}` : '未关联'}</dd></div>
                  <div><dt>备注</dt><dd>{vehicle.remark || '暂无备注'}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>

        <form className="insurance-editor" onSubmit={saveVehicle}>
          <div className="form-heading">
            <span>{formMode === 'create' ? '新增客户车辆' : '编辑客户车辆'}</span>
            <strong>{draft.id}</strong>
          </div>
          <div className="form-grid">
            <label>
              客户名称
              <input required value={draft.customer} onChange={(event) => updateField('customer', event.target.value)} placeholder="必填，请输入客户名称" />
            </label>
            <label>
              手机号
              <input value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="可选，请输入手机号" />
            </label>
            <label>
              车牌号
              <input required value={draft.plate} onChange={(event) => updateField('plate', event.target.value)} placeholder="必填，请输入车牌号" />
            </label>
            <label>
              车型
              <input required value={draft.car} onChange={(event) => updateField('car', event.target.value)} placeholder="必填，请输入车型" />
            </label>
            <label>
              车架号
              <input value={draft.vin} onChange={(event) => updateField('vin', event.target.value)} placeholder="可选，请输入车架号" />
            </label>
            <label>
              保险公司
              <select value={draft.insurer} onChange={(event) => updateField('insurer', event.target.value)}>
                {visibleInsurerOptions.map((insurer) => <option key={insurer}>{insurer}</option>)}
              </select>
            </label>
            <label>
              车辆类型
              <select value={draft.vehicleType} onChange={(event) => updateField('vehicleType', event.target.value)}>
                <option>标的车</option>
                <option>三者车</option>
              </select>
            </label>
            <label>
              档案来源
              <select value={draft.source} onChange={(event) => updateField('source', event.target.value)}>
                <option>手动录入</option>
                <option>维修接待</option>
                <option>保险台账</option>
                <option>历史维修</option>
              </select>
            </label>
            <label className="full-field">
              备注
              <textarea value={draft.remark} onChange={(event) => updateField('remark', event.target.value)} placeholder="可选，请输入客户偏好、续保提醒、车辆情况" />
            </label>
          </div>
          <div className="form-total">
            <span>关联提示</span>
            <strong>{relatedCounts(draft).repairs} 单维修 / {relatedCounts(draft).policies} 条保险</strong>
          </div>
          <div className="form-actions">
            <button type="button" onClick={startCreate}>清空新增</button>
            <button type="submit">保存档案</button>
          </div>
        </form>
      </div>

      {filteredVehicles.length === 0 ? (
        <section className="placeholder-panel">
          <h2>暂无匹配车辆</h2>
          <p>当前筛选或搜索条件下没有客户车辆档案，可以清空搜索或新增车辆。</p>
        </section>
      ) : null}
    </section>
  );
}

const exportConfigs = {
  orders: {
    title: '维修工单',
    filename: '维修工单',
    icon: 'order',
    columns: [
      { label: '工单号', value: (row) => row.id },
      { label: '进厂日期', value: (row) => row.date },
      { label: '进厂时间', value: (row) => row.time },
      { label: '车牌号', value: (row) => row.plate },
      { label: '客户名称', value: (row) => row.customer },
      { label: '手机号', value: (row) => row.phone },
      { label: '车型', value: (row) => row.car },
      { label: '保险公司', value: (row) => row.insurer },
      { label: '保险到期日', value: (row) => row.insuranceExpiry || '' },
      { label: '车辆类型', value: (row) => row.type },
      { label: '事故类型', value: (row) => row.accidentType || '' },
      { label: '维修状态', value: (row) => row.status },
      { label: '维修项目', value: (row) => row.record },
      { label: '工时费', value: (row) => row.labor },
      { label: '材料费', value: (row) => row.material },
      { label: '工单金额', value: (row) => row.amount },
      { label: '业务员', value: (row) => row.staff },
      { label: '预计交车', value: (row) => row.delivery },
      { label: '到账回执', value: (row) => row.settlementReceiptName || '' },
    ],
  },
  insurance: {
    title: '保险记录',
    filename: '保险记录',
    icon: 'shield',
    columns: [
      { label: '保险编号', value: (row) => row.id },
      { label: '车牌号', value: (row) => row.plate },
      { label: '客户名称', value: (row) => row.customer },
      { label: '手机号', value: (row) => row.phone },
      { label: '车型', value: (row) => row.car },
      { label: '车架号', value: (row) => row.vin },
      { label: '保险公司', value: (row) => row.insurer },
      { label: '到期日期', value: (row) => row.expiry },
      { label: '到期状态', value: (row) => insuranceState(row) },
      { label: '投保金额', value: (row) => row.amount },
      { label: '险种', value: (row) => row.type },
    ],
  },
  vehicles: {
    title: '客户车辆',
    filename: '客户车辆',
    icon: 'car',
    columns: [
      { label: '档案编号', value: (row) => row.id },
      { label: '客户名称', value: (row) => row.customer },
      { label: '手机号', value: (row) => row.phone },
      { label: '车牌号', value: (row) => row.plate },
      { label: '车型', value: (row) => row.car },
      { label: '车架号', value: (row) => row.vin },
      { label: '保险公司', value: (row) => row.insurer },
      { label: '车辆类型', value: (row) => row.vehicleType },
      { label: '档案来源', value: (row) => row.source },
      { label: '备注', value: (row) => row.remark },
    ],
  },
};

function DataExportPage({ orders, policies, vehicles }) {
  const [activeType, setActiveType] = useState('orders');
  const [keyword, setKeyword] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const exportData = {
    orders,
    insurance: policies,
    vehicles,
  };
  const config = exportConfigs[activeType];
  const rows = exportData[activeType];
  const filteredRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return rows;
    return rows.filter((row) => Object.values(row).join(' ').toLowerCase().includes(normalizedKeyword));
  }, [keyword, rows]);
  const filteredRowKeys = useMemo(
    () => filteredRows.map((row, index) => exportRowKey(row, activeType, index)),
    [activeType, filteredRows],
  );
  const selectedRows = useMemo(
    () => filteredRows.filter((row, index) => selectedRowKeys.includes(exportRowKey(row, activeType, index))),
    [activeType, filteredRows, selectedRowKeys],
  );
  const rowsToExport = selectedRows.length > 0 ? selectedRows : filteredRows;
  const isAllSelected = filteredRowKeys.length > 0 && filteredRowKeys.every((key) => selectedRowKeys.includes(key));

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [activeType, keyword]);

  function toggleRow(key) {
    setSelectedRowKeys((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  }

  function toggleAllRows() {
    setSelectedRowKeys(isAllSelected ? [] : filteredRowKeys);
  }

  function exportCurrentRows() {
    const workbook = buildExcelWorkbook(config.title, config.columns, rowsToExport);
    const today = '2026-07-21';
    downloadExcel(`${config.filename}-${today}.xls`, workbook);
  }

  return (
    <section className="export-layout">
      <div className="export-type-grid">
        {Object.entries(exportConfigs).map(([key, item]) => (
          <button key={key} className={activeType === key ? 'export-type-card active' : 'export-type-card'} onClick={() => setActiveType(key)}>
            <span className={`metric-icon ${key === 'insurance' ? 'red' : 'blue'}`}><AssetIcon name={metricIconMap[item.icon]} /></span>
            <div>
              <strong>{item.title}</strong>
              <small>{exportData[key].length} 条可导出</small>
            </div>
          </button>
        ))}
      </div>

      <div className="history-summary">
        <Metric icon="order" title="当前类型" value={config.title} trend="Excel 格式" tone="blue" />
        <Metric icon="car" title="筛选记录" value={`${filteredRows.length} 条`} trend="按关键词过滤" tone="green" />
        <Metric icon="shield" title="已选择" value={`${selectedRows.length} 条`} trend={selectedRows.length > 0 ? '仅导出已选记录' : '未选择则导出筛选结果'} tone="orange" />
        <Metric icon="yuan" title="数据来源" value="本地数据" trend="localStorage" tone="blue" />
      </div>

      <section className="table-panel">
        <div className="table-titlebar">
          <h2>{config.title}导出</h2>
          <div>
            <button onClick={() => setKeyword('')}>重置</button>
            <button className="filter-primary" onClick={exportCurrentRows}>导出Excel</button>
          </div>
        </div>
        <div className="customer-search-panel export-search">
          <AssetIcon name="action-search.png" className="field-icon" />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="按客户、车牌、手机号、编号等关键词筛选导出内容" />
        </div>
        <div className="export-preview">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="select-column">
                    <input type="checkbox" checked={isAllSelected} onChange={toggleAllRows} aria-label="全选当前筛选记录" />
                  </th>
                  {config.columns.slice(0, 8).map((column) => <th key={column.label}>{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={Math.min(config.columns.length, 8) + 1} className="empty-table-cell">暂无可导出数据</td></tr>
                ) : filteredRows.map((row, index) => {
                  const rowKey = exportRowKey(row, activeType, index);
                  return (
                  <tr key={rowKey} className={selectedRowKeys.includes(rowKey) ? 'selected-row' : ''}>
                    <td className="select-column">
                      <input
                        type="checkbox"
                        checked={selectedRowKeys.includes(rowKey)}
                        onChange={() => toggleRow(rowKey)}
                        aria-label={`选择第 ${index + 1} 条记录`}
                      />
                    </td>
                    {config.columns.slice(0, 8).map((column) => <td key={column.label}>{column.value(row)}</td>)}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p>当前显示 {filteredRows.length} 条记录、前 8 个字段；{selectedRows.length > 0 ? `将导出已选择的 ${selectedRows.length} 条记录。` : '未勾选时导出当前筛选结果。'}</p>
        </div>
      </section>
    </section>
  );
}

function exportRowKey(row, activeType, index) {
  return `${activeType}-${row.id || row.plate || row.phone || index}`;
}

function SummaryReportsPage({ orders, policies = [] }) {
  const [filters, setFilters] = useState({
    start: '2026-07-01',
    end: '2026-07-31',
    staff: '全部业务员',
    insurer: '全部保险公司',
    status: '全部状态',
  });

  const staffOptions = useMemo(() => ['全部业务员', ...uniqueValues(orders.map((order) => order.staff))], [orders]);
  const insurerOptions = useMemo(() => ['全部保险公司', ...uniqueValues(orders.map((order) => order.insurer))], [orders]);
  const statusOptions = useMemo(() => ['全部状态', ...uniqueValues(orders.map((order) => order.status))], [orders]);

  const filteredReportOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = normalizeOrderDate(order.date);
      const inDateRange = orderDate >= filters.start && orderDate <= filters.end;
      const inStaff = filters.staff === '全部业务员' || order.staff === filters.staff;
      const inInsurer = filters.insurer === '全部保险公司' || order.insurer === filters.insurer;
      const inStatus = filters.status === '全部状态' || order.status === filters.status;
      return inDateRange && inStaff && inInsurer && inStatus;
    });
  }, [filters, orders]);

  const reportTotals = useMemo(() => summarizeOrders(filteredReportOrders), [filteredReportOrders]);
  const staffRows = useMemo(() => groupReportRows(filteredReportOrders, 'staff'), [filteredReportOrders]);
  const insurerRows = useMemo(() => groupReportRows(filteredReportOrders, 'insurer'), [filteredReportOrders]);
  const statusRows = useMemo(() => groupReportRows(filteredReportOrders, 'status'), [filteredReportOrders]);
  const maxGroupAmount = Math.max(1, ...[...staffRows, ...insurerRows, ...statusRows].map((row) => row.amount));
  const expiringPolicies = policies.filter((policy) => {
    const state = insuranceState(policy);
    return state.includes('到期') || state.includes('过期');
  }).length;

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="report-layout">
      <div className="report-hero">
        <div>
          <span>经营汇总</span>
          <h2>汇总报表</h2>
          <p>按日期、业务员、保险公司和维修状态汇总产值、台次、工时费、材料费与结算金额。</p>
        </div>
        <button onClick={() => setFilters({ start: '2026-07-01', end: '2026-07-31', staff: '全部业务员', insurer: '全部保险公司', status: '全部状态' })}>
          重置筛选
        </button>
      </div>

      <div className="report-filter-panel">
        <label>
          开始日期
          <input type="date" value={filters.start} onChange={(event) => updateFilter('start', event.target.value)} />
        </label>
        <label>
          结束日期
          <input type="date" value={filters.end} onChange={(event) => updateFilter('end', event.target.value)} />
        </label>
        <label>
          业务员
          <select value={filters.staff} onChange={(event) => updateFilter('staff', event.target.value)}>
            {staffOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          保险公司
          <select value={filters.insurer} onChange={(event) => updateFilter('insurer', event.target.value)}>
            {insurerOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          维修状态
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            {statusOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="report-metrics">
        <Metric icon="yuan" title="筛选产值（元）" value={formatMoney(reportTotals.amount)} trend={`${reportTotals.count} 台次`} tone="blue" />
        <Metric icon="car" title="维修台次（台）" value={reportTotals.count.toString()} trend="按当前条件统计" tone="green" />
        <Metric icon="order" title="已结算金额" value={formatMoney(reportTotals.settledAmount)} trend={`${reportTotals.settledCount} 单`} tone="blue" />
        <Metric icon="order" title="未结算金额" value={formatMoney(reportTotals.pendingAmount)} trend={`${reportTotals.pendingCount} 单`} tone="orange" />
        <Metric icon="yuan" title="工时费合计" value={formatMoney(reportTotals.labor)} trend="维修工时项目" tone="blue" />
        <Metric icon="shield" title="保险提醒" value={`${expiringPolicies} 条`} trend="即将到期/已过期" tone="red" />
      </div>

      <div className="report-grid">
        <ReportRanking title="按业务员统计" rows={staffRows} maxAmount={maxGroupAmount} />
        <ReportRanking title="按保险公司统计" rows={insurerRows} maxAmount={maxGroupAmount} />
        <ReportRanking title="按维修状态统计" rows={statusRows} maxAmount={maxGroupAmount} />
      </div>

      <section className="table-panel report-table-panel">
        <div className="table-titlebar">
          <h2>汇总明细</h2>
          <div>
            <button>{filteredReportOrders.length} 条记录</button>
            <button>保持当前筛选</button>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>分组维度</th>
                <th>名称</th>
                <th>台次</th>
                <th>产值</th>
                <th>工时费</th>
                <th>材料费</th>
                <th>已结算</th>
                <th>未结算</th>
                <th>占比</th>
              </tr>
            </thead>
            <tbody>
              {[['业务员', staffRows], ['保险公司', insurerRows], ['维修状态', statusRows]].flatMap(([dimension, rows]) =>
                rows.map((row) => (
                  <tr key={`${dimension}-${row.name}`}>
                    <td>{dimension}</td>
                    <td><strong className="plate-link">{row.name}</strong></td>
                    <td>{row.count}</td>
                    <td>{formatMoney(row.amount)}</td>
                    <td>{formatMoney(row.labor)}</td>
                    <td>{formatMoney(row.material)}</td>
                    <td>{formatMoney(row.settledAmount)}</td>
                    <td>{formatMoney(row.pendingAmount)}</td>
                    <td>{reportTotals.amount ? `${Math.round((row.amount / reportTotals.amount) * 100)}%` : '0%'}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function ReportRanking({ title, rows, maxAmount }) {
  return (
    <section className="chart-panel report-ranking">
      <PanelHeader title={title} action={`${rows.length} 组`} />
      <div className="report-ranking-list">
        {rows.length === 0 ? (
          <p className="report-empty">当前筛选条件下暂无数据</p>
        ) : rows.map((row) => (
          <article key={row.name} className="report-rank-row">
            <div>
              <strong>{row.name}</strong>
              <span>{row.count} 台次 · {formatMoney(row.amount)}</span>
            </div>
            <div className="report-rank-bar"><i style={{ width: `${Math.max(8, (row.amount / maxAmount) * 100)}%` }} /></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DictionaryManager({ title, description, entries, draft, collapsed, onToggle, onDraftChange, onEdit, onDelete, onSubmit }) {
  const isStaff = draft.category === 'staff';
  return (
    <article className={collapsed ? 'dictionary-card is-collapsed' : 'dictionary-card'}>
      <header>
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
        <div className="collapse-actions">
          <span>{entries.length} 项</span>
          <button type="button" onClick={onToggle}>{collapsed ? '展开' : '收起'}</button>
        </div>
      </header>
      {collapsed ? null : (
        <>
          <div className="dictionary-list">
            {entries.length === 0 ? (
              <div className="settings-empty">暂无字典项</div>
            ) : entries.map((entry) => (
              <div key={entry.id} className={entry.isActive ? 'dictionary-item active' : 'dictionary-item'}>
                <div>
                  <strong>{entry.value}</strong>
                  {entry.extra ? <span>{entry.extra}</span> : null}
                </div>
                <small>{entry.isActive ? '启用' : '停用'} · 排序 {entry.sortOrder}</small>
                <button type="button" onClick={() => onEdit(entry)}>编辑</button>
                <button type="button" className="danger" onClick={() => onDelete(entry)}>删除</button>
              </div>
            ))}
          </div>
          <form className="dictionary-form" onSubmit={onSubmit}>
            <label>
              {isStaff ? '岗位职称' : '保险公司名称'}
              <input value={draft.value} onChange={(event) => onDraftChange((current) => ({ ...current, value: event.target.value }))} placeholder={isStaff ? '必填，请输入岗位职称' : '必填，请输入保险公司名称'} />
            </label>
            {isStaff ? (
              <label>
                人员名称
                <input value={draft.extra} onChange={(event) => onDraftChange((current) => ({ ...current, extra: event.target.value }))} placeholder="必填，请输入人员名称" />
              </label>
            ) : null}
            <label>
              排序
              <input type="number" value={draft.sortOrder} onChange={(event) => onDraftChange((current) => ({ ...current, sortOrder: event.target.value }))} />
            </label>
            <label className="settings-switch-field">
              启用
              <input type="checkbox" checked={draft.isActive} onChange={(event) => onDraftChange((current) => ({ ...current, isActive: event.target.checked }))} />
            </label>
            <div className="account-form-actions">
              <button type="button" onClick={() => onDraftChange(createDictionaryDraft(draft.category))}>清空</button>
              <button type="submit">{draft.id ? '保存修改' : '新增字典'}</button>
            </div>
          </form>
        </>
      )}
    </article>
  );
}

function createAccountDraft(account) {
  return {
    id: account?.id || '',
    username: account?.username || '',
    password: account?.password || '',
    role: account?.role || 'staff',
    title: account?.title || account?.label || '员工',
    displayName: account?.displayName || '',
    companyId: account?.companyId || 'tongda',
    isActive: account?.isActive ?? true,
    permissions: account?.role === 'admin'
      ? allPermissionKeys
      : Array.isArray(account?.permissions) && account.permissions.length > 0
        ? account.permissions
        : defaultStaffPermissions,
  };
}

function createDictionaryDraft(category = 'insurer', entry = null) {
  return {
    id: entry?.id || '',
    category,
    value: entry?.value || '',
    extra: entry?.extra || '',
    sortOrder: entry?.sortOrder ?? 10,
    isActive: entry?.isActive ?? true,
  };
}

function SystemSettingsPage({ session, cloudState, orders, dictionaries, canViewLogs, onDictionariesChange, onRefreshOrders }) {
  const [logs, setLogs] = useState([]);
  const [logState, setLogState] = useState({ loading: false, error: '' });
  const [accounts, setAccounts] = useState([]);
  const [accountDraft, setAccountDraft] = useState(createAccountDraft());
  const [accountState, setAccountState] = useState({ loading: false, message: '', error: '' });
  const [insurerDraft, setInsurerDraft] = useState(createDictionaryDraft('insurer'));
  const [staffDraft, setStaffDraft] = useState(createDictionaryDraft('staff'));
  const [dictionaryState, setDictionaryState] = useState({ loading: false, message: '', error: '' });
  const [collapsedSections, setCollapsedSections] = useState({
    insurerDictionary: true,
    staffDictionary: true,
    accounts: true,
    logs: true,
  });
  const isAdmin = session?.role === 'admin';
  const canManageSettings = hasUiPermission(session, 'settings');
  const insurerDictionaries = dictionaries.filter((entry) => entry.category === 'insurer');
  const staffDictionaries = dictionaries.filter((entry) => entry.category === 'staff');

  function toggleSettingsSection(section) {
    setCollapsedSections((current) => ({ ...current, [section]: !current[section] }));
  }

  function loadLogs() {
    if (!canViewLogs) return;
    setLogState({ loading: true, error: '' });
    fetchOperationLogs(session)
      .then((nextLogs) => {
        setLogs(nextLogs);
        setLogState({ loading: false, error: '' });
      })
      .catch((error) => setLogState({ loading: false, error: error.message || '日志读取失败' }));
  }

  function loadAccounts() {
    if (!isAdmin) return;
    setAccountState((current) => ({ ...current, loading: true, error: '' }));
    fetchAccounts(session)
      .then((nextAccounts) => {
        setAccounts(nextAccounts);
        setAccountState({ loading: false, message: '', error: '' });
      })
      .catch((error) => setAccountState({ loading: false, message: '', error: error.message || '账号读取失败' }));
  }

  function editAccount(account) {
    setAccountDraft(createAccountDraft(account));
    setAccountState({ loading: false, message: '', error: '' });
  }

  function updateAccountPermission(permission, checked) {
    setAccountDraft((current) => {
      const currentPermissions = Array.isArray(current.permissions) ? current.permissions : [];
      const nextPermissions = checked
        ? [...new Set([...currentPermissions, permission])]
        : currentPermissions.filter((item) => item !== permission);
      return { ...current, permissions: nextPermissions };
    });
  }

  function submitAccount(event) {
    event.preventDefault();
    if (!isAdmin) return;
    setAccountState({ loading: true, message: '', error: '' });
    saveAccount(accountDraft, session)
      .then(() => {
        setAccountDraft(createAccountDraft());
        setAccountState({ loading: false, message: '账号已保存', error: '' });
        loadAccounts();
        loadLogs();
      })
      .catch((error) => setAccountState({ loading: false, message: '', error: error.message || '账号保存失败' }));
  }

  function removeAccount(account) {
    if (!isAdmin) return;
    setAccountState({ loading: true, message: '', error: '' });
    deleteAccount(account.id, session)
      .then(() => {
        setAccounts((current) => current.filter((item) => item.id !== account.id));
        setAccountDraft((current) => (current.id === account.id ? createAccountDraft() : current));
        setAccountState({ loading: false, message: `${account.username} 已删除`, error: '' });
        loadLogs();
      })
      .catch((error) => setAccountState({ loading: false, message: '', error: error.message || '账号删除失败' }));
  }

  function refreshDictionaries() {
    fetchDictionaries(session)
      .then((nextDictionaries) => onDictionariesChange(nextDictionaries))
      .catch((error) => setDictionaryState({ loading: false, message: '', error: error.message || '字典刷新失败' }));
  }

  function submitDictionary(event, draft, resetDraft) {
    event.preventDefault();
    if (!canManageSettings) return;
    setDictionaryState({ loading: true, message: '', error: '' });
    saveDictionaryEntry(draft, session)
      .then(() => {
        resetDraft(createDictionaryDraft(draft.category));
        setDictionaryState({ loading: false, message: '字典已保存', error: '' });
        refreshDictionaries();
        if (canViewLogs) loadLogs();
      })
      .catch((error) => setDictionaryState({ loading: false, message: '', error: error.message || '字典保存失败' }));
  }

  function removeDictionary(entry) {
    if (!canManageSettings) return;
    setDictionaryState({ loading: true, message: '', error: '' });
    deleteDictionaryEntry(entry.id, session)
      .then(() => {
        onDictionariesChange(dictionaries.filter((item) => item.id !== entry.id));
        setDictionaryState({ loading: false, message: `${entry.value} 已删除`, error: '' });
        if (canViewLogs) loadLogs();
      })
      .catch((error) => setDictionaryState({ loading: false, message: '', error: error.message || '字典删除失败' }));
  }

  useEffect(() => {
    if (isAdmin) {
      loadAccounts();
    }
    if (canViewLogs) {
      loadLogs();
    }
  }, [isAdmin, canViewLogs]);

  return (
    <section className="settings-layout">
      <div className="settings-hero">
        <div>
          <span>系统设置</span>
          <h2>权限、云端状态与操作记录</h2>
          <p>当前系统已启用云端访问码校验和 D1 数据库存储。</p>
        </div>
        <button onClick={onRefreshOrders}>刷新云端数据</button>
      </div>

      <div className="settings-grid">
        <article className="settings-card">
          <h3>当前登录</h3>
          <dl>
            <div><dt>角色</dt><dd>{session?.role === 'admin' ? '管理员' : '员工'}</dd></div>
            <div><dt>身份</dt><dd>{session?.label || '未识别'}</dd></div>
            <div><dt>权限</dt><dd>{isAdmin ? '全部权限' : permissionsForSession(session).map((key) => permissionItems.find((item) => item.key === key)?.label).filter(Boolean).join('、')}</dd></div>
          </dl>
        </article>

        <article className="settings-card">
          <h3>云端数据库</h3>
          <dl>
            <div><dt>数据库</dt><dd>chengxu-db</dd></div>
            <div><dt>工单数量</dt><dd>{orders.length} 条</dd></div>
            <div><dt>连接状态</dt><dd>{cloudState?.loading ? '同步中' : cloudState?.error ? cloudState.error : '正常'}</dd></div>
          </dl>
        </article>

        <article className="settings-card">
          <h3>账号登录</h3>
          <dl>
            <div><dt>登录方式</dt><dd>公司 + 账号 + 密码</dd></div>
            <div><dt>当前公司</dt><dd>{companyById(session?.companyId || 'tongda').shortName}</dd></div>
            <div><dt>账号管理</dt><dd>{isAdmin ? '可维护' : '仅管理员'}</dd></div>
          </dl>
        </article>
      </div>

      {canManageSettings ? (
        <section className="settings-card settings-access-card">
          <div className="settings-access-heading">
            <div>
              <h3>基础字典</h3>
              <p>维护当前公司的保险公司选项和人员岗位，新增工单、保险档案、客户车辆会同步使用。</p>
            </div>
            <span>{dictionaries.length} 条字典</span>
          </div>
          {dictionaryState.error ? <div className="cloud-banner error">{dictionaryState.error}</div> : null}
          {dictionaryState.message ? <div className="cloud-banner">{dictionaryState.message}</div> : null}
          <div className="dictionary-grid">
            <DictionaryManager
              title="保险公司字典"
              description="用于工单、保险档案、客户车辆的保险公司下拉项。"
              entries={insurerDictionaries}
              draft={insurerDraft}
              collapsed={collapsedSections.insurerDictionary}
              onToggle={() => toggleSettingsSection('insurerDictionary')}
              onDraftChange={setInsurerDraft}
              onEdit={(entry) => setInsurerDraft(createDictionaryDraft('insurer', entry))}
              onDelete={removeDictionary}
              onSubmit={(event) => submitDictionary(event, insurerDraft, setInsurerDraft)}
            />
            <DictionaryManager
              title="人员岗位字典"
              description="职称和人员名称会合并显示在工单业务员选项中。"
              entries={staffDictionaries}
              draft={staffDraft}
              collapsed={collapsedSections.staffDictionary}
              onToggle={() => toggleSettingsSection('staffDictionary')}
              onDraftChange={setStaffDraft}
              onEdit={(entry) => setStaffDraft(createDictionaryDraft('staff', entry))}
              onDelete={removeDictionary}
              onSubmit={(event) => submitDictionary(event, staffDraft, setStaffDraft)}
            />
          </div>
        </section>
      ) : null}

      {isAdmin ? (
        <section className="settings-card settings-access-card">
          <div className="settings-access-heading">
            <div>
              <h3>账号密码管理</h3>
              <p>维护两家公司登录账号、密码、角色、所属公司和启用状态。原访问码管理暂不使用。</p>
            </div>
            <div className="collapse-actions">
              <span>{accounts.length} 个账号</span>
              <button type="button" onClick={() => toggleSettingsSection('accounts')}>{collapsedSections.accounts ? '展开' : '收起'}</button>
            </div>
          </div>
          {collapsedSections.accounts ? null : (
            <>
              {accountState.error ? <div className="cloud-banner error">{accountState.error}</div> : null}
              {accountState.message ? <div className="cloud-banner">{accountState.message}</div> : null}
              <div className="access-code-list">
                {accounts.map((account) => (
                  <article key={account.id} className={`${account.isActive ? 'active' : ''} ${accountDraft.id === account.id ? 'selected' : ''}`}>
                    <div>
                      <strong>{account.username}</strong>
                      <p>{account.displayName || account.label}</p>
                    </div>
                    <dl>
                      <div><dt>密码</dt><dd>{account.password || '需重设'}</dd></div>
                      <div><dt>岗位</dt><dd>{account.role === 'admin' ? '管理员' : account.title || account.label}</dd></div>
                      <div><dt>角色</dt><dd>{account.role === 'admin' ? '管理员' : '员工'}</dd></div>
                      <div><dt>公司</dt><dd>{account.role === 'admin' ? '全部公司' : companyById(account.companyId).shortName}</dd></div>
                      <div><dt>状态</dt><dd>{account.isActive ? '启用中' : '已停用'}</dd></div>
                      <div><dt>权限</dt><dd>{account.role === 'admin' ? '全部权限' : (account.permissions || []).map((key) => permissionItems.find((item) => item.key === key)?.label).filter(Boolean).join('、') || '未分配'}</dd></div>
                    </dl>
                    <div className="access-code-actions">
                      <button type="button" onClick={() => editAccount(account)}>编辑</button>
                      <button type="button" className="danger" onClick={() => removeAccount(account)}>删除</button>
                    </div>
                  </article>
                ))}
              </div>
              <form className="settings-account-form" onSubmit={submitAccount}>
                <label>
                  账号
                  <input value={accountDraft.username} onChange={(event) => setAccountDraft((current) => ({ ...current, username: event.target.value }))} placeholder="必填，请输入账号" />
                </label>
                <label>
                  密码
                  <input value={accountDraft.password} onChange={(event) => setAccountDraft((current) => ({ ...current, password: event.target.value }))} placeholder="必填，请输入6-32位密码" />
                </label>
                <label>
                  人员名称
                  <input value={accountDraft.displayName} onChange={(event) => setAccountDraft((current) => ({ ...current, displayName: event.target.value }))} placeholder="请输入人员名称" />
                </label>
                <label>
                  岗位职称
                  <input value={accountDraft.title} disabled={accountDraft.role === 'admin'} onChange={(event) => setAccountDraft((current) => ({ ...current, title: event.target.value }))} placeholder="请输入岗位职称" />
                </label>
                <label>
                  角色
                  <select value={accountDraft.role} onChange={(event) => setAccountDraft((current) => ({ ...current, role: event.target.value }))}>
                    <option value="admin">管理员</option>
                    <option value="staff">员工</option>
                  </select>
                </label>
                <label>
                  所属公司
                  <select
                    value={accountDraft.companyId}
                    disabled={accountDraft.role === 'admin'}
                    onChange={(event) => setAccountDraft((current) => ({ ...current, companyId: event.target.value }))}
                  >
                    {companies.map((company) => <option key={company.id} value={company.id}>{company.shortName}</option>)}
                  </select>
                </label>
                <label className="settings-switch-field">
                  启用账号
                  <input type="checkbox" checked={accountDraft.isActive} onChange={(event) => setAccountDraft((current) => ({ ...current, isActive: event.target.checked }))} />
                </label>
                <div className="permission-checks">
                  <span>权限分配</span>
                  <div>
                    {permissionItems.map((permission) => (
                      <label key={permission.key}>
                        <input
                          type="checkbox"
                          disabled={accountDraft.role === 'admin'}
                          checked={accountDraft.role === 'admin' || accountDraft.permissions.includes(permission.key)}
                          onChange={(event) => updateAccountPermission(permission.key, event.target.checked)}
                        />
                        {permission.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="account-form-actions">
                  <button type="button" onClick={() => setAccountDraft(createAccountDraft())}>清空新增</button>
                  <button type="submit" disabled={accountState.loading}>{accountState.loading ? '保存中...' : accountDraft.id ? '保存账号' : '新增账号'}</button>
                </div>
              </form>
            </>
          )}
        </section>
      ) : null}

      <section className="table-panel">
        <div className="table-titlebar">
          <h2>操作日志</h2>
          <div>
            {logState.loading ? <span className="settings-note">读取中...</span> : null}
            {canViewLogs ? <button onClick={loadLogs}>刷新日志</button> : null}
            <button type="button" className="collapse-toggle" onClick={() => toggleSettingsSection('logs')}>{collapsedSections.logs ? '展开' : '收起'}</button>
          </div>
        </div>
        {collapsedSections.logs ? null : !canViewLogs ? (
          <div className="settings-empty">当前账号未分配操作日志权限。</div>
        ) : logState.error ? (
          <div className="cloud-banner error">{logState.error}</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>操作</th>
                  <th>对象</th>
                  <th>角色</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan="5" className="empty-table-cell">暂无操作记录</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.created_at}</td>
                    <td>{log.action}</td>
                    <td>{log.target_id}</td>
                    <td>{log.label || log.role}</td>
                    <td>{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeOrderDate(date) {
  const value = String(date || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}-\d{2}$/.test(value)) return `2026-${value}`;
  return '2026-07-01';
}

function summarizeOrders(orders) {
  return orders.reduce((summary, order) => {
    const amount = Number(order.amount) || 0;
    const labor = Number(order.labor) || 0;
    const material = Number(order.material) || 0;
    const status = String(order.status || '');
    const isPending = status.includes('待') || status.includes('未');
    const isSettled = status.includes('结算') && !isPending;
    summary.count += 1;
    summary.amount += amount;
    summary.labor += labor;
    summary.material += material;
    if (isPending) {
      summary.pendingCount += 1;
      summary.pendingAmount += amount;
    }
    if (isSettled) {
      summary.settledCount += 1;
      summary.settledAmount += amount;
    }
    return summary;
  }, {
    count: 0,
    amount: 0,
    labor: 0,
    material: 0,
    pendingCount: 0,
    pendingAmount: 0,
    settledCount: 0,
    settledAmount: 0,
  });
}

function groupReportRows(orders, field) {
  const grouped = new Map();
  orders.forEach((order) => {
    const key = order[field] || '未填写';
    const current = grouped.get(key) || [];
    current.push(order);
    grouped.set(key, current);
  });
  return [...grouped.entries()]
    .map(([name, groupedOrders]) => ({ name, ...summarizeOrders(groupedOrders) }))
    .sort((a, b) => b.amount - a.amount);
}

function PlaceholderPage({ title, orders }) {
  if (title === navItems[5]) {
    return <SummaryReportsPage orders={orders} />;
  }

  return (
    <section className="placeholder-panel">
      <h2>{title}</h2>
      <p>该页面入口已保留。后续会接入云端数据、筛选条件、汇总报表和 Excel 导出能力。</p>
      <div className="placeholder-summary">
        <Metric icon="order" title="当前筛选工单" value={orders.length.toString()} trend="模拟数据" tone="blue" />
        <Metric icon="yuan" title="可导出记录" value={`${orders.length + insuranceRows.length}`} trend="待接入导出" tone="green" />
      </div>
    </section>
  );
}

function NoPermissionPage({ title }) {
  return (
    <section className="placeholder-panel">
      <h2>{title}</h2>
      <p>当前账号没有该功能权限。导出相关功能仅管理员可用。</p>
    </section>
  );
}

function MobileTabs({ activePage, setActivePage }) {
  const tabs = ['首页看板', '维修接待', '车辆保险', '历史查询'];
  return (
    <nav className="mobile-tabs" aria-label="移动端导航">
      {tabs.map((tab) => (
        <button key={tab} className={activePage === tab ? 'active' : ''} onClick={() => setActivePage(tab)}>
          <span><AssetIcon name={navIcon(tab)} /></span>
          {tab}
        </button>
      ))}
    </nav>
  );
}

function navIcon(item) {
  return navIconMap[item] || 'flow-line.png';
}

function statusClass(status) {
  return {
    在修中: 'repairing',
    已完工: 'done',
    已结算: 'settled',
    待结算: 'pending',
  }[status] || 'pending';
}

export default App;
