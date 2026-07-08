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

const ORDER_STORAGE_KEY = 'chengxu-repair-orders';
const INSURANCE_STORAGE_KEY = 'chengxu-insurance-policies';
const CUSTOMER_VEHICLE_STORAGE_KEY = 'chengxu-customer-vehicles';
const ACCESS_SESSION_KEY = 'chengxu-access-session';
const INSURANCE_BASE_DATE = '2026-07-21';

function companyById(companyId) {
  return companies.find((company) => company.id === companyId) || companies[0];
}

function AssetIcon({ name, alt = '', className = '' }) {
  return <img className={className} src={`${iconBase}${name}`} alt={alt} aria-hidden={alt ? undefined : 'true'} />;
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
    throw new Error(data.error || `云端保存失败：${response.status}`);
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

function daysUntilExpiry(expiry) {
  const base = new Date(`${INSURANCE_BASE_DATE}T00:00:00`);
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
  const [createRequest, setCreateRequest] = useState(0);
  const [receptionFocus, setReceptionFocus] = useState(null);
  const [insuranceFocusRequest, setInsuranceFocusRequest] = useState(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [ordersCloudState, setOrdersCloudState] = useState({ loading: false, error: '' });

  const currentCompany = companyById(accessSession?.companyId || 'tongda');
  const isAdmin = accessSession?.role === 'admin';
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
    localStorage.setItem(INSURANCE_STORAGE_KEY, JSON.stringify(insurancePolicies));
  }, [insurancePolicies]);

  useEffect(() => {
    localStorage.setItem(CUSTOMER_VEHICLE_STORAGE_KEY, JSON.stringify(customerVehicles));
  }, [customerVehicles]);

  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return companyOrders.filter((order) => {
      const orderDate = orderDateValue(order.date);
      const inDateRange = (!dateRange.start || orderDate >= dateRange.start) && (!dateRange.end || orderDate <= dateRange.end);
      const inKeyword = !keyword || [order.id, order.plate, order.customer, order.phone, order.status, order.insurer, order.car, order.staff]
        .join(' ')
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
      .then(() => setOrdersCloudState({ loading: false, error: '' }))
      .catch((error) => setOrdersCloudState({ loading: false, error: error.message || '云端保存失败' }));
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
          {navItems.filter((item) => isAdmin || item !== '数据导出').map((item) => (
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
          {isAdmin ? (
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
                {companyInsurancePolicies.filter(isInsuranceUrgent).length + companyOrders.filter((order) => order.status !== REPAIR_STATUS.settled).length}
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
                <h3>待处理提醒</h3>
                {companyInsurancePolicies.filter(isInsuranceUrgent).slice(0, 4).map((policy) => (
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
                {companyOrders.filter((order) => order.status !== REPAIR_STATUS.settled).slice(0, 3).map((order) => (
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
                {companyInsurancePolicies.filter(isInsuranceUrgent).length === 0 && companyOrders.filter((order) => order.status !== REPAIR_STATUS.settled).length === 0 ? (
                  <p>暂无待处理事项</p>
                ) : null}
              </div>
            ) : null}
            {userMenuOpen ? (
              <div className="topbar-popover user-popover">
                <h3>{accessSession?.role === 'admin' ? '门店管理员' : '门店员工'}</h3>
                <p>{accessSession?.displayName || accessSession?.label || '已登录账号'} · {currentCompany.shortName}</p>
                <button type="button" onClick={() => {
                  setActivePage('系统设置');
                  setUserMenuOpen(false);
                }}>系统设置</button>
                <button type="button" onClick={logout}>退出登录</button>
              </div>
            ) : null}
          </div>
        </header>

        {activePage === '首页看板' && (
          <Dashboard
            filteredOrders={filteredOrders}
            policies={companyInsurancePolicies}
            onRefreshOrders={refreshOrders}
            onViewInsurance={openInsurancePolicy}
          />
        )}
        {activePage === '维修接待' && (
          <RepairReception
            orders={filteredOrders}
            createRequest={createRequest}
            focusRequest={receptionFocus}
            onSaveOrder={saveOrder}
            onStatusChange={updateOrderStatus}
            cloudState={ordersCloudState}
            role={accessSession?.role || 'staff'}
            onVoidOrder={voidOrder}
          />
        )}
        {activePage === '历史查询' && (
          <HistoryQueryPage
            orders={companyOrders}
            onView={(order) => openOrderInReception(order, 'view')}
            onEdit={(order) => openOrderInReception(order, 'edit')}
          />
        )}
        {activePage === '车辆保险' && (
          <InsuranceLedger policies={companyInsurancePolicies} onSavePolicy={saveInsurancePolicy} focusPolicyRequest={insuranceFocusRequest} />
        )}
        {activePage === '客户车辆' && (
          <CustomerVehiclesPage
            vehicles={companyCustomerVehicles}
            orders={companyOrders}
            policies={companyInsurancePolicies}
            onSaveVehicle={saveCustomerVehicle}
          />
        )}
        {activePage === '数据导出' && isAdmin && (
          <DataExportPage
            orders={companyOrders}
            policies={companyInsurancePolicies}
            vehicles={companyCustomerVehicles}
          />
        )}
        {activePage === '数据导出' && !isAdmin && <NoPermissionPage title="数据导出" />}
        {activePage === '系统设置' && (
          <SystemSettingsPage
            session={accessSession}
            cloudState={ordersCloudState}
            orders={companyOrders}
            onRefreshOrders={refreshOrders}
          />
        )}
        {!['首页看板', '维修接待', '历史查询', '车辆保险', '客户车辆', '数据导出', '系统设置'].includes(activePage) && (
          <PlaceholderPage title={activePage} orders={filteredOrders} />
        )}
      </main>

      <MobileTabs activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}

function Dashboard({ filteredOrders, policies, onRefreshOrders, onViewInsurance }) {
  const total = filteredOrders.reduce((sum, order) => sum + order.amount, 0);
  const activeOrders = filteredOrders.filter((order) => order.status !== REPAIR_STATUS.settled);
  const pendingAmount = activeOrders.reduce((sum, order) => sum + order.amount, 0);
  const repairingOrders = filteredOrders.filter((order) => order.status === REPAIR_STATUS.repairing);
  const completedOrders = filteredOrders.filter((order) => order.status === REPAIR_STATUS.completed);
  const pendingSettlementOrders = filteredOrders.filter((order) => order.status === REPAIR_STATUS.pendingSettlement);
  const settledOrders = filteredOrders.filter((order) => order.status === REPAIR_STATUS.settled);
  const todayOrders = filteredOrders.filter((order) => order.date === '07-04');
  const todayAmount = todayOrders.reduce((sum, order) => sum + order.amount, 0);
  const laborTotal = filteredOrders.reduce((sum, order) => sum + order.labor, 0);
  const materialTotal = filteredOrders.reduce((sum, order) => sum + order.material, 0);
  const costTotal = laborTotal + materialTotal;
  const laborPercent = costTotal > 0 ? Math.round((laborTotal / costTotal) * 100) : 0;
  const materialPercent = costTotal > 0 ? 100 - laborPercent : 0;
  const urgentPolicies = policies.filter(isInsuranceUrgent);

  return (
    <section className="dashboard-grid">
      <div className="metric-strip">
        <Metric icon="yuan" title="今日产值（元）" value={formatMoney(todayAmount)} trend="云端实时" tone="blue" />
        <Metric icon="car" title="今日台次（台）" value={todayOrders.length.toString()} trend="云端实时" tone="blue" />
        <Metric icon="order" title="未结算（元）" value={formatMoney(pendingAmount)} trend={`待处理 ${activeOrders.length} 单`} tone="orange" />
        <Metric icon="car" title="在修车辆（台）" value={repairingOrders.length.toString()} trend="待处理" tone="green" />
        <Metric icon="yuan" title="本月产值（元）" value={formatMoney(total)} trend="云端累计" tone="blue" />
        <Metric icon="car" title="本月台次（台）" value={filteredOrders.length.toString()} trend="月累计" tone="blue" />
        <Metric icon="shield" title="即将保险到期（台）" value={urgentPolicies.length.toString()} trend="需跟进" tone="red" />
      </div>

      <section className="workflow-panel">
        <h2>维修流程概览</h2>
        <div className="workflow-grid">
          <WorkflowColumn tone="blue" title={`在修（${repairingOrders.length}）`} order={repairingOrders[0]} footer="预计交车" />
          <WorkflowColumn tone="green" title={`完工（${completedOrders.length}）`} order={completedOrders[0]} footer="待交车" />
          <WorkflowColumn tone="orange" title={`未结算（${pendingSettlementOrders.length}）`} order={pendingSettlementOrders[0]} footer="请及时结算" />
          <WorkflowColumn tone="gray" title={`结算（${settledOrders.length}）`} order={settledOrders[0]} footer="已归档" />
        </div>
      </section>

      <div className="chart-panel trend-panel">
        <PanelHeader title="本月产值趋势（元）" action="按日统计" />
        <LineChart values={productionTrend} />
      </div>

      <div className="chart-panel status-panel">
        <PanelHeader title="维修状态分布" />
        <div className="status-donut">
          <div className="donut-ring"><strong>共 {filteredOrders.length} 台</strong></div>
          <ul>
            <li><span className="dot blue" />在修 <em>{repairingOrders.length} 台</em></li>
            <li><span className="dot green" />完工 <em>{completedOrders.length} 台</em></li>
            <li><span className="dot orange" />未结算 <em>{pendingSettlementOrders.length} 台</em></li>
            <li><span className="dot gray" />结算 <em>{settledOrders.length} 台</em></li>
          </ul>
        </div>
      </div>

      <div className="chart-panel cost-panel">
        <PanelHeader title="工时费 / 材料费占比" action="收入结构" />
        <div className="cost-donut">
          <div className="donut-ring blue-green"><strong>{formatMoney(costTotal)}</strong></div>
          <ul>
            <li><span className="dot blue" />工时费 <em>{laborPercent}%</em><small>{formatMoney(laborTotal)}</small></li>
            <li><span className="dot green" />材料费 <em>{materialPercent}%</em><small>{formatMoney(materialTotal)}</small></li>
          </ul>
        </div>
      </div>

      <InsuranceReminder policies={urgentPolicies} onViewInsurance={onViewInsurance} />
      <RecentOrders orders={filteredOrders} onRefreshOrders={onRefreshOrders} />
    </section>
  );
}

function Metric({ icon, title, value, trend, tone }) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${tone}`}><AssetIcon name={metricIconMap[icon]} /></span>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        <small>{trend}</small>
      </div>
    </article>
  );
}

function WorkflowColumn({ tone, title, order, footer }) {
  if (!order) {
    return (
      <article className="workflow-card empty">
        <header><strong>{title}</strong><span>→</span></header>
        <div className="empty-clipboard"><AssetIcon name="empty-table.png" /></div>
        <p>暂无数据</p>
      </article>
    );
  }

  return (
    <article className={`workflow-card ${tone}`}>
      <header><strong>{title}</strong><span>→</span></header>
      <div className="workflow-body">
        <b>{order.plate}　{order.car}</b>
        <p>{order.customer}　{order.phone}</p>
        <p>进厂：2026-07-23　{order.time}</p>
        <p>项目：{order.record}</p>
        <span className={`status-chip ${statusClass(order.status)}`}>{order.status}</span>
        <small>{footer}</small>
      </div>
    </article>
  );
}

function PanelHeader({ title, action }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      {action ? <button>{action}</button> : null}
    </div>
  );
}

function LineChart({ values }) {
  const width = 520;
  const height = 156;
  const max = Math.max(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
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
          const x = (index / (values.length - 1)) * width;
          const y = height - (value / max) * (height - 18) - 8;
          return <circle key={index} cx={x} cy={y} r="3.6" fill="#0875de" stroke="#fff" strokeWidth="2" />;
        })}
      </svg>
      <div className="chart-axis"><span>07-01</span><span>07-06</span><span>07-11</span><span>07-16</span><span>07-21</span><span>07-26</span><span>07-31</span></div>
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

function RecentOrders({ orders, onRefreshOrders }) {
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
      <OrderTable orders={pageOrders} />
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
const insurerOptions = ['人保财险', '平安保险', '太平洋保险', '阳光保险'];
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
  };
}

function normalizeQueryText(value) {
  return String(value || '').trim().toLowerCase();
}

function orderDateValue(orderDate) {
  return `2026-${orderDate}`;
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

function HistoryQueryPage({ orders, onView, onEdit }) {
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
            <input value={draftFilters.plate} onChange={(event) => updateFilter('plate', event.target.value)} placeholder="粤B" />
          </label>
          <label>
            客户名称
            <input value={draftFilters.customer} onChange={(event) => updateFilter('customer', event.target.value)} placeholder="陈先生" />
          </label>
          <label>
            手机号
            <input value={draftFilters.phone} onChange={(event) => updateFilter('phone', event.target.value)} placeholder="138" />
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

function RepairReception({ orders, createRequest, focusRequest, onSaveOrder, onStatusChange, cloudState, role, onVoidOrder }) {
  const [selectedId, setSelectedId] = useState(() => orders[0]?.id || '');
  const [formMode, setFormMode] = useState('view');
  const [draft, setDraft] = useState(() => createOrderDraft(orders[0]));
  const [detailOrder, setDetailOrder] = useState(null);
  const [settlementOrder, setSettlementOrder] = useState(null);
  const [voidOrderTarget, setVoidOrderTarget] = useState(null);
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

  function changeStatus(status) {
    if (!selected) return;
    if (status === REPAIR_STATUS.settled) {
      setSettlementOrder(selected);
      return;
    }
    onStatusChange(selected.id, status);
    setDraft(createOrderDraft({ ...selected, status }));
  }

  function printOrder(order) {
    setDetailOrder(order);
    window.setTimeout(() => window.print(), 120);
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
            onView={openView}
            onEdit={openEdit}
            onPrint={printOrder}
            onSettle={(order) => setSettlementOrder(order)}
            onVoid={role === 'admin' ? (order) => setVoidOrderTarget(order) : null}
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
                <button onClick={() => changeStatus(REPAIR_STATUS.repairing)}>切为在修</button>
                <button onClick={() => changeStatus(REPAIR_STATUS.completed)}>切为完工</button>
                <button onClick={() => changeStatus(REPAIR_STATUS.pendingSettlement)}>待结算</button>
                <button onClick={() => changeStatus(REPAIR_STATUS.settled)}>完成结算</button>
              </div>
              <button className="wide-edit-button" onClick={() => openEdit(selected)}>编辑当前工单</button>
            </>
          ) : (
            <OrderForm
              draft={draft}
              mode={formMode}
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
          onClose={() => setDetailOrder(null)}
          onEdit={() => openEdit(detailOrder)}
          onPrint={() => printOrder(detailOrder)}
          onSettle={() => setSettlementOrder(detailOrder)}
          onVoid={role === 'admin' ? () => setVoidOrderTarget(detailOrder) : null}
        />
      ) : null}
      {settlementOrder ? (
        <SettlementDialog
          order={settlementOrder}
          onClose={() => setSettlementOrder(null)}
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

function OrderDetailDialog({ order, onClose, onEdit, onPrint, onSettle, onVoid }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title" onClick={(event) => event.stopPropagation()}>
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
          <div><dt>结算时间</dt><dd>{order.settlementDate ? `${order.settlementDate} ${order.settlementTime || ''}` : '未结算'}</dd></div>
          <div><dt>结算备注</dt><dd>{order.settlementRemark || '暂无备注'}</dd></div>
          <div><dt>工时费</dt><dd>{formatMoney(order.labor)}</dd></div>
          <div><dt>材料费</dt><dd>{formatMoney(order.material)}</dd></div>
          <div className="modal-wide"><dt>维修项目</dt><dd>{order.record}</dd></div>
          <div className="modal-wide"><dt>接待备注</dt><dd>{order.remark || '暂无备注'}</dd></div>
        </div>

        <footer className="modal-actions">
          <button type="button" onClick={onPrint}>打印工单</button>
          {order.status !== REPAIR_STATUS.settled ? <button type="button" onClick={onSettle}>结算工单</button> : null}
          {onVoid ? <button type="button" onClick={onVoid}>作废工单</button> : null}
          <button type="button" onClick={onEdit}>编辑工单</button>
        </footer>
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

function SettlementDialog({ order, onClose, onSubmit }) {
  const [draft, setDraft] = useState(() => createSettlementDraft(order));

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submitSettlement(event) {
    event.preventDefault();
    onSubmit(draft);
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
        </div>

        <footer className="modal-actions">
          <button type="button" onClick={onClose}>取消</button>
          <button type="submit">确认结算</button>
        </footer>
      </form>
    </div>
  );
}

function OrderForm({ draft, mode, onChange, onCancel, onSubmit }) {
  const labor = normalizeMoney(draft.labor);
  const material = normalizeMoney(draft.material);

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
          <input required value={draft.plate} onChange={(event) => updateField('plate', event.target.value)} placeholder="粤B·8A123" />
        </label>
        <label>
          客户名称
          <input required value={draft.customer} onChange={(event) => updateField('customer', event.target.value)} placeholder="陈先生" />
        </label>
        <label>
          手机号
          <input required value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="138****5678" />
        </label>
        <label>
          车型
          <input required value={draft.car} onChange={(event) => updateField('car', event.target.value)} placeholder="本田 凯美瑞" />
        </label>
        <label>
          车架号
          <input value={draft.vin} onChange={(event) => updateField('vin', event.target.value)} placeholder="LFV3A24G6N30***21" />
        </label>
        <label>
          保险案件号
          <input value={draft.claimNo} onChange={(event) => updateField('claimNo', event.target.value)} placeholder="可选，保险维修时填写" />
        </label>
        <label>
          保险公司
          <select value={draft.insurer} onChange={(event) => updateField('insurer', event.target.value)}>
            {insurerOptions.map((insurer) => <option key={insurer}>{insurer}</option>)}
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
          <input required value={draft.time} onChange={(event) => updateField('time', event.target.value)} placeholder="10:25" />
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
            <option>在修中</option>
            <option>已完工</option>
            <option>待结算</option>
            <option>已结算</option>
          </select>
        </label>
        <label>
          业务员
          <select value={draft.staff} onChange={(event) => updateField('staff', event.target.value)}>
            <option>张工</option>
            <option>王工</option>
            <option>李工</option>
          </select>
        </label>
        <label className="full-field">
          维修项目
          <textarea required value={draft.record} onChange={(event) => updateField('record', event.target.value)} placeholder="填写维修项目、故障描述或接待备注" />
        </label>
        <label className="full-field">
          预计交车
          <input value={draft.delivery} onChange={(event) => updateField('delivery', event.target.value)} placeholder="07-23 15:00" />
        </label>
        <label className="full-field">
          接待备注
          <textarea value={draft.remark} onChange={(event) => updateField('remark', event.target.value)} placeholder="记录客户要求、定损说明、取车提醒等信息" />
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

function OrderTable({ orders, onView, onEdit, onPrint, onSettle, onVoid }) {
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
            <tr key={order.id}>
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
                  <button onClick={() => onView?.(order)}>查看</button>
                  <button onClick={() => onEdit?.(order)}>编辑</button>
                  <button onClick={() => onPrint?.(order)}>打印</button>
                  {order.status !== REPAIR_STATUS.settled ? (
                    <button onClick={() => onSettle?.(order)}>结算</button>
                  ) : (
                    <button onClick={() => onView?.(order)}>已结</button>
                  )}
                  {onVoid ? <button onClick={() => onVoid(order)}>作废</button> : null}
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

function InsuranceLedger({ policies, onSavePolicy, focusPolicyRequest }) {
  const [activeFilter, setActiveFilter] = useState('7天内到期');
  const [formMode, setFormMode] = useState('create');
  const [draft, setDraft] = useState(createInsuranceDraft);

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
              <input required value={draft.plate} onChange={(event) => updateField('plate', event.target.value)} placeholder="粤B·8A123" />
            </label>
            <label>
              客户名称
              <input required value={draft.customer} onChange={(event) => updateField('customer', event.target.value)} placeholder="陈先生" />
            </label>
            <label>
              手机号
              <input value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="138****5678" />
            </label>
            <label>
              车型
              <input required value={draft.car} onChange={(event) => updateField('car', event.target.value)} placeholder="本田 凯美瑞" />
            </label>
            <label>
              车架号
              <input value={draft.vin} onChange={(event) => updateField('vin', event.target.value)} placeholder="LFV3A24G6N30***21" />
            </label>
            <label>
              保险公司
              <select value={draft.insurer} onChange={(event) => updateField('insurer', event.target.value)}>
                <option>人保财险</option>
                <option>平安保险</option>
                <option>太平洋保险</option>
                <option>阳光保险</option>
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
              <input required value={draft.type} onChange={(event) => updateField('type', event.target.value)} placeholder="交强险 / 商业险" />
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

function CustomerVehiclesPage({ vehicles, orders, policies, onSaveVehicle }) {
  const [keyword, setKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState('全部车辆');
  const [formMode, setFormMode] = useState('create');
  const [draft, setDraft] = useState(createCustomerVehicleDraft);

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
              <input required value={draft.customer} onChange={(event) => updateField('customer', event.target.value)} placeholder="陈先生" />
            </label>
            <label>
              手机号
              <input value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="138****5678" />
            </label>
            <label>
              车牌号
              <input required value={draft.plate} onChange={(event) => updateField('plate', event.target.value)} placeholder="粤B·8A123" />
            </label>
            <label>
              车型
              <input required value={draft.car} onChange={(event) => updateField('car', event.target.value)} placeholder="本田 凯美瑞" />
            </label>
            <label>
              车架号
              <input value={draft.vin} onChange={(event) => updateField('vin', event.target.value)} placeholder="LFV3A24G6N30***21" />
            </label>
            <label>
              保险公司
              <select value={draft.insurer} onChange={(event) => updateField('insurer', event.target.value)}>
                <option>人保财险</option>
                <option>平安保险</option>
                <option>太平洋保险</option>
                <option>阳光保险</option>
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
              <textarea value={draft.remark} onChange={(event) => updateField('remark', event.target.value)} placeholder="记录客户偏好、续保提醒、车辆情况等信息" />
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

  function exportCurrentRows() {
    const workbook = buildExcelWorkbook(config.title, config.columns, filteredRows);
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
        <Metric icon="shield" title="导出字段" value={`${config.columns.length} 项`} trend="含业务字段" tone="orange" />
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
                  {config.columns.slice(0, 8).map((column) => <th key={column.label}>{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={Math.min(config.columns.length, 8)} className="empty-table-cell">暂无可导出数据</td></tr>
                ) : filteredRows.slice(0, 8).map((row) => (
                  <tr key={row.id || row.plate}>
                    {config.columns.slice(0, 8).map((column) => <td key={column.label}>{column.value(row)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>预览最多显示前 8 条、前 8 个字段；导出的 Excel 文件会包含当前筛选结果的全部字段。</p>
        </div>
      </section>
    </section>
  );
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

function createAccountDraft(account) {
  return {
    id: account?.id || '',
    username: account?.username || '',
    password: account?.password || '',
    role: account?.role || 'staff',
    displayName: account?.displayName || '',
    companyId: account?.companyId || 'tongda',
    isActive: account?.isActive ?? true,
  };
}

function SystemSettingsPage({ session, cloudState, orders, onRefreshOrders }) {
  const [logs, setLogs] = useState([]);
  const [logState, setLogState] = useState({ loading: false, error: '' });
  const [accounts, setAccounts] = useState([]);
  const [accountDraft, setAccountDraft] = useState(createAccountDraft());
  const [accountState, setAccountState] = useState({ loading: false, message: '', error: '' });
  const isAdmin = session?.role === 'admin';

  function loadLogs() {
    if (!isAdmin) return;
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

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
      loadAccounts();
    }
  }, [isAdmin]);

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
            <div><dt>权限</dt><dd>{isAdmin ? '可作废工单、查看操作日志' : '可新增、编辑、结算工单'}</dd></div>
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

      {isAdmin ? (
        <section className="settings-card settings-access-card">
          <div className="settings-access-heading">
            <div>
              <h3>账号密码管理</h3>
              <p>维护两家公司登录账号、密码、角色、所属公司和启用状态。原访问码管理暂不使用。</p>
            </div>
            <span>{accounts.length} 个账号</span>
          </div>
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
                  <div><dt>角色</dt><dd>{account.role === 'admin' ? '管理员' : '员工'}</dd></div>
                  <div><dt>公司</dt><dd>{account.role === 'admin' ? '全部公司' : companyById(account.companyId).shortName}</dd></div>
                  <div><dt>状态</dt><dd>{account.isActive ? '启用中' : '已停用'}</dd></div>
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
              <input value={accountDraft.username} onChange={(event) => setAccountDraft((current) => ({ ...current, username: event.target.value }))} placeholder="例如 tongda" />
            </label>
            <label>
              密码
              <input value={accountDraft.password} onChange={(event) => setAccountDraft((current) => ({ ...current, password: event.target.value }))} placeholder="6-32位密码" />
            </label>
            <label>
              人员名称
              <input value={accountDraft.displayName} onChange={(event) => setAccountDraft((current) => ({ ...current, displayName: event.target.value }))} placeholder="例如 张三" />
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
            <div className="account-form-actions">
              <button type="button" onClick={() => setAccountDraft(createAccountDraft())}>清空新增</button>
              <button type="submit" disabled={accountState.loading}>{accountState.loading ? '保存中...' : accountDraft.id ? '保存账号' : '新增账号'}</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="table-panel">
        <div className="table-titlebar">
          <h2>操作日志</h2>
          <div>
            {logState.loading ? <span className="settings-note">读取中...</span> : null}
            {isAdmin ? <button onClick={loadLogs}>刷新日志</button> : null}
          </div>
        </div>
        {!isAdmin ? (
          <div className="settings-empty">员工账号无权查看操作日志。</div>
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
