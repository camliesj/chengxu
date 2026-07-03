import React, { useEffect, useMemo, useState } from 'react';

const navItems = ['首页看板', '维修接待', '历史查询', '车辆保险', '客户车辆', '汇总报表', '数据导出', '系统设置'];

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
const INSURANCE_BASE_DATE = '2026-07-21';

function AssetIcon({ name, alt = '', className = '' }) {
  return <img className={className} src={`${iconBase}${name}`} alt={alt} aria-hidden={alt ? undefined : 'true'} />;
}

const repairOrders = [
  {
    id: 'RO20260723003',
    date: '07-23',
    time: '10:25',
    plate: '粤B·8A123',
    customer: '陈先生',
    phone: '138****5678',
    car: '本田 凯美瑞',
    insurer: '人保财险',
    type: '标的车',
    status: '在修中',
    labor: 160,
    material: 320,
    amount: 480,
    record: '常规保养',
    staff: '张工',
    delivery: '07-23 15:00',
    vin: 'LFV3A24G6N30***21',
    claimNo: 'PIC20260723003',
    accidentType: '常规维修',
    paymentMethod: '待确认',
    remark: '客户要求交车前清洗外观。',
  },
  {
    id: 'RO20260723002',
    date: '07-23',
    time: '09:40',
    plate: '粤A·3C789',
    customer: '李女士',
    phone: '139****1234',
    car: '大众 迈腾',
    insurer: '平安保险',
    type: '三者车',
    status: '已完工',
    labor: 240,
    material: 740,
    amount: 980,
    record: '更换刹车片',
    staff: '王工',
    delivery: '待交车',
    vin: 'LBV8W3109P0***82',
    claimNo: 'PA20260723002',
    accidentType: '保险维修',
    paymentMethod: '保险直赔',
    remark: '完工后通知客户验车。',
  },
  {
    id: 'RO20260723001',
    date: '07-23',
    time: '08:30',
    plate: '粤B·7D555',
    customer: '刘先生',
    phone: '137****8888',
    car: '大众 迈腾',
    insurer: '太平洋保险',
    type: '标的车',
    status: '待结算',
    labor: 120,
    material: 230,
    amount: 350,
    record: '机油更换',
    staff: '张工',
    delivery: '07-23 10:30',
    vin: 'LC0CE4CD8N0***47',
    claimNo: 'CPIC20260723001',
    accidentType: '常规维修',
    paymentMethod: '现金',
    remark: '待客户确认结算。',
  },
  {
    id: 'RO20260722008',
    date: '07-22',
    time: '16:20',
    plate: '粤A·1E222',
    customer: '黄先生',
    phone: '136****2468',
    car: '日产 轩逸',
    insurer: '阳光保险',
    type: '三者车',
    status: '已结算',
    labor: 80,
    material: 200,
    amount: 280,
    record: '空调清洗',
    staff: '李工',
    delivery: '07-22 17:00',
    vin: 'LGBH52E05NY0***18',
    claimNo: '',
    accidentType: '常规维修',
    paymentMethod: '微信',
    remark: '已结清。',
  },
  {
    id: 'RO20260722007',
    date: '07-22',
    time: '15:10',
    plate: '粤B·2F333',
    customer: '周女士',
    phone: '135****8766',
    car: '别克 英朗',
    insurer: '人保财险',
    type: '标的车',
    status: '已结算',
    labor: 200,
    material: 360,
    amount: 560,
    record: '前轮定位',
    staff: '王工',
    delivery: '07-22 15:50',
    vin: 'LSGKE5418NW0***33',
    claimNo: 'PIC20260722007',
    accidentType: '小事故',
    paymentMethod: '保险直赔',
    remark: '客户已取车。',
  },
  {
    id: 'RO20260721006',
    date: '07-21',
    time: '10:15',
    plate: '粤A·6G777',
    customer: '吴先生',
    phone: '132****9981',
    car: '奥迪 A4L',
    insurer: '太平洋保险',
    type: '标的车',
    status: '在修中',
    labor: 240,
    material: 520,
    amount: 760,
    record: '更换火花塞',
    staff: '张工',
    delivery: '07-21 16:00',
    vin: 'LFV3A28K8P30***76',
    claimNo: '',
    accidentType: '常规维修',
    paymentMethod: '待确认',
    remark: '配件已到，安排下午施工。',
  },
];

const orderRepository = {
  listOrders(sourceOrders) {
    return [...sourceOrders];
  },
};

function readStoredOrders() {
  try {
    const rawOrders = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!rawOrders) return repairOrders;
    const parsedOrders = JSON.parse(rawOrders);
    return Array.isArray(parsedOrders) && parsedOrders.length > 0 ? parsedOrders : repairOrders;
  } catch {
    return repairOrders;
  }
}

function normalizeInsurancePolicy(policy, index = 0) {
  return {
    id: policy.id || `IP${Date.now()}${index}`,
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

function normalizeCustomerVehicle(vehicle, index = 0) {
  return {
    id: vehicle.id || `CV${Date.now()}${index}`,
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

const insuranceReminders = [
  { plate: '粤B·5J999', car: '丰田 RAV4', customer: '王女士', phone: '137****2222', traffic: '2026-07-25', commercial: '2026-07-25', remaining: '剩余4天' },
  { plate: '粤A·8K321', car: '本田 雅阁', customer: '赵先生', phone: '139****6666', traffic: '2026-07-27', commercial: '2026-07-27', remaining: '剩余6天' },
];

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
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function submitAccess(event) {
    event.preventDefault();
    if (code.trim() === '888888') {
      localStorage.setItem('shop-access-granted', 'true');
      onUnlock();
      return;
    }
    setError('访问码不正确，请输入演示访问码 888888');
  }

  return (
    <main className="access-page">
      <section className="access-panel">
        <div className="brand-mark">车</div>
        <h1>汽修接待 & 保险管理系统</h1>
        <p>请输入门店访问码后进入系统。正式上线后，访问码将由云端接口统一校验。</p>
        <form onSubmit={submitAccess} className="access-form">
          <label htmlFor="access-code">门店访问码</label>
          <input
            id="access-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError('');
            }}
            placeholder="请输入 888888"
            inputMode="numeric"
          />
          {error ? <span className="form-error">{error}</span> : null}
          <button type="submit">进入系统</button>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [isUnlocked, setIsUnlocked] = useState(() => localStorage.getItem('shop-access-granted') === 'true');
  const [activePage, setActivePage] = useState('首页看板');
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState(readStoredOrders);
  const [insurancePolicies, setInsurancePolicies] = useState(readStoredInsurancePolicies);
  const [customerVehicles, setCustomerVehicles] = useState(readStoredCustomerVehicles);
  const [createRequest, setCreateRequest] = useState(0);
  const [receptionFocus, setReceptionFocus] = useState(null);

  const orderData = useMemo(() => orderRepository.listOrders(orders), [orders]);

  useEffect(() => {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(INSURANCE_STORAGE_KEY, JSON.stringify(insurancePolicies));
  }, [insurancePolicies]);

  useEffect(() => {
    localStorage.setItem(CUSTOMER_VEHICLE_STORAGE_KEY, JSON.stringify(customerVehicles));
  }, [customerVehicles]);

  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return orderData;
    return orderData.filter((order) =>
      [order.id, order.plate, order.customer, order.phone, order.status, order.insurer]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [orderData, query]);

  function saveOrder(nextOrder) {
    setOrders((currentOrders) => {
      const exists = currentOrders.some((order) => order.id === nextOrder.id);
      if (exists) {
        return currentOrders.map((order) => (order.id === nextOrder.id ? nextOrder : order));
      }
      return [nextOrder, ...currentOrders];
    });
  }

  function updateOrderStatus(orderId, status) {
    setOrders((currentOrders) =>
      currentOrders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    );
  }

  function openOrderInReception(order, mode) {
    setQuery('');
    setReceptionFocus({ id: order.id, mode, requestId: Date.now() });
    setActivePage('维修接待');
  }

  function saveInsurancePolicy(nextPolicy) {
    setInsurancePolicies((currentPolicies) => {
      const normalizedPolicy = normalizeInsurancePolicy(nextPolicy);
      const exists = currentPolicies.some((policy) => policy.id === normalizedPolicy.id);
      if (exists) {
        return currentPolicies.map((policy) => (policy.id === normalizedPolicy.id ? normalizedPolicy : policy));
      }
      return [normalizedPolicy, ...currentPolicies];
    });
  }

  function saveCustomerVehicle(nextVehicle) {
    setCustomerVehicles((currentVehicles) => {
      const normalizedVehicle = normalizeCustomerVehicle(nextVehicle);
      const exists = currentVehicles.some((vehicle) => vehicle.id === normalizedVehicle.id);
      if (exists) {
        return currentVehicles.map((vehicle) => (vehicle.id === normalizedVehicle.id ? normalizedVehicle : vehicle));
      }
      return [normalizedVehicle, ...currentVehicles];
    });
  }

  if (!isUnlocked) {
    return <AccessGate onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="sidebar-brand">
          <span className="brand-icon"><AssetIcon name="metric-car.png" /></span>
          <div>
            <strong>汽修接待</strong>
            <small>& 保险管理系统</small>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
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
          onClick={() => {
            localStorage.removeItem('shop-access-granted');
            setIsUnlocked(false);
          }}
        >
          ‹‹ 收起菜单
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="menu-button" aria-label="展开菜单">☰</button>
          <div className="date-range">
            <input type="date" defaultValue="2026-07-01" aria-label="开始日期" />
            <span>至</span>
            <input type="date" defaultValue="2026-07-31" aria-label="结束日期" />
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
          <button className="secondary-action"><AssetIcon name="action-excel.png" className="button-icon" />导出Excel</button>
          <div className="topbar-user">
            <span className="notice-dot">8</span>
            <span className="avatar" />
            <strong>陈先生</strong>
            <small>门店管理员</small>
          </div>
        </header>

        {activePage === '首页看板' && <Dashboard filteredOrders={filteredOrders} />}
        {activePage === '维修接待' && (
          <RepairReception
            orders={filteredOrders}
            createRequest={createRequest}
            focusRequest={receptionFocus}
            onSaveOrder={saveOrder}
            onStatusChange={updateOrderStatus}
          />
        )}
        {activePage === '历史查询' && (
          <HistoryQueryPage
            orders={orderData}
            onView={(order) => openOrderInReception(order, 'view')}
            onEdit={(order) => openOrderInReception(order, 'edit')}
          />
        )}
        {activePage === '车辆保险' && (
          <InsuranceLedger policies={insurancePolicies} onSavePolicy={saveInsurancePolicy} />
        )}
        {activePage === '客户车辆' && (
          <CustomerVehiclesPage
            vehicles={customerVehicles}
            orders={orderData}
            policies={insurancePolicies}
            onSaveVehicle={saveCustomerVehicle}
          />
        )}
        {activePage === '数据导出' && (
          <DataExportPage
            orders={orderData}
            policies={insurancePolicies}
            vehicles={customerVehicles}
          />
        )}
        {!['首页看板', '维修接待', '历史查询', '车辆保险', '客户车辆', '数据导出'].includes(activePage) && (
          <PlaceholderPage title={activePage} orders={filteredOrders} />
        )}
      </main>

      <MobileTabs activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}

function Dashboard({ filteredOrders }) {
  const total = filteredOrders.reduce((sum, order) => sum + order.amount, 0);
  const pendingAmount = filteredOrders.filter((order) => order.status === '待结算').reduce((sum, order) => sum + order.amount, 0);
  const repairing = filteredOrders.filter((order) => order.status === '在修中').length;

  return (
    <section className="dashboard-grid">
      <div className="metric-strip">
        <Metric icon="yuan" title="今日产值（元）" value={formatMoney(5260)} trend="较昨日 +12.8%" tone="blue" />
        <Metric icon="car" title="今日台次（台）" value="2" trend="较昨日 +1" tone="blue" />
        <Metric icon="order" title="未结算（元）" value={formatMoney(pendingAmount + 8100)} trend="待处理 1 单" tone="orange" />
        <Metric icon="car" title="在修车辆（台）" value={repairing.toString()} trend="待处理" tone="green" />
        <Metric icon="yuan" title="本月产值（元）" value={formatMoney(total + 89430)} trend="较上月 +18.6%" tone="blue" />
        <Metric icon="car" title="本月台次（台）" value="126" trend="月累计" tone="blue" />
        <Metric icon="shield" title="即将保险到期（台）" value="2" trend="7天内到期" tone="red" />
      </div>

      <section className="workflow-panel">
        <h2>维修流程概览</h2>
        <div className="workflow-grid">
          <WorkflowColumn tone="blue" title="在修（1）" order={repairOrders[0]} footer="预计交车：07-23 15:00" />
          <WorkflowColumn tone="green" title="完工（1）" order={repairOrders[1]} footer="待交车" />
          <WorkflowColumn tone="orange" title="未结算（1）" order={repairOrders[2]} footer="请及时结算" />
          <article className="workflow-card empty">
            <header><strong>结算（0）</strong><span>→</span></header>
            <div className="empty-clipboard"><AssetIcon name="empty-table.png" /></div>
            <p>暂无数据</p>
          </article>
        </div>
      </section>

      <div className="chart-panel trend-panel">
        <PanelHeader title="本月产值趋势（元）" action="按日统计" />
        <LineChart values={productionTrend} />
      </div>

      <div className="chart-panel status-panel">
        <PanelHeader title="维修状态分布" />
        <div className="status-donut">
          <div className="donut-ring"><strong>共 3 台</strong></div>
          <ul>
            <li><span className="dot blue" />在修 <em>28%（1）</em></li>
            <li><span className="dot green" />完工 <em>46%（1）</em></li>
            <li><span className="dot orange" />未结算 <em>18%（1）</em></li>
            <li><span className="dot gray" />结算 <em>8%（0）</em></li>
          </ul>
        </div>
      </div>

      <div className="chart-panel cost-panel">
        <PanelHeader title="工时费 / 材料费占比" action="收入结构" />
        <div className="cost-donut">
          <div className="cost-ring"><strong>{formatMoney(5260)}</strong></div>
          <ul>
            <li><span className="dot blue" />工时费 <em>35% ¥1,841</em></li>
            <li><span className="dot green" />材料费 <em>65% ¥3,419</em></li>
          </ul>
        </div>
      </div>

      <InsuranceReminder />
      <RecentOrders orders={filteredOrders} />
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

function InsuranceReminder() {
  return (
    <section className="chart-panel reminder-panel">
      <PanelHeader title="保险到期提醒" action="7天内到期 2 台" />
      <div className="reminder-list">
        {insuranceReminders.map((item) => (
          <article key={item.plate} className="reminder-row">
            <div>
              <b>{item.plate}　{item.car}</b>
              <p>{item.customer}　{item.phone}</p>
              <p>交强险到期：{item.traffic} <em>（{item.remaining}）</em></p>
              <p>商业险到期：{item.commercial} <em>（{item.remaining}）</em></p>
            </div>
            <button>查看</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecentOrders({ orders }) {
  return (
    <section className="table-panel recent-orders">
      <div className="table-titlebar">
        <h2>最近维修工单</h2>
        <div>
          <button>全部状态⌄</button>
          <button>⟳ 刷新</button>
        </div>
      </div>
      <OrderTable orders={orders} />
      <footer className="table-footer">
        <span>共 23 条</span>
        <button>20条/页⌄</button>
        <div className="pagination"><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>›</button></div>
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
      type: order.type,
      status: order.status,
      labor: String(order.labor),
      material: String(order.material),
      record: order.record,
      staff: order.staff,
      delivery: order.delivery,
      vin: order.vin || '',
      claimNo: order.claimNo || '',
      accidentType: order.accidentType || '常规维修',
      paymentMethod: order.paymentMethod || '待确认',
      remark: order.remark || '',
    };
  }

  const now = new Date();
  const serial = String(now.getTime()).slice(-5);
  return {
    id: `RO202607${serial}`,
    date: '07-23',
    time: '11:30',
    plate: '',
    customer: '',
    phone: '',
    car: '',
    insurer: '人保财险',
    type: '标的车',
    status: '在修中',
    labor: '0',
    material: '0',
    record: '',
    staff: '张工',
    delivery: '待确认',
    vin: '',
    claimNo: '',
    accidentType: '常规维修',
    paymentMethod: '待确认',
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
    record: draft.record.trim(),
    vin: draft.vin.trim(),
    claimNo: draft.claimNo.trim(),
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
const insurerOptions = ['人保财险', '平安保险', '太平洋保险', '阳光保险'];
const vehicleTypeOptions = ['标的车', '三者车'];

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

function RepairReception({ orders, createRequest, focusRequest, onSaveOrder, onStatusChange }) {
  const [selectedId, setSelectedId] = useState(() => orders[0]?.id || repairOrders[0].id);
  const [formMode, setFormMode] = useState('view');
  const [draft, setDraft] = useState(() => createOrderDraft(orders[0] || repairOrders[0]));
  const [detailOrder, setDetailOrder] = useState(null);

  useEffect(() => {
    if (createRequest > 0) {
      setFormMode('create');
      setDraft(createOrderDraft());
    }
  }, [createRequest]);

  useEffect(() => {
    if (!orders.some((order) => order.id === selectedId) && orders[0]) {
      setSelectedId(orders[0].id);
    }
  }, [orders, selectedId]);

  const selected = orders.find((order) => order.id === selectedId) || orders[0] || repairOrders[0];

  useEffect(() => {
    if (!focusRequest) return;
    const focusedOrder = orders.find((order) => order.id === focusRequest.id);
    if (!focusedOrder) return;
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
    onStatusChange(selected.id, status);
    setDraft(createOrderDraft({ ...selected, status }));
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
          <OrderTable orders={orders} onView={openView} onEdit={openEdit} />
        </div>
        <aside className="detail-panel">
          {formMode === 'view' ? (
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
                <div><dt>车辆类型</dt><dd>{selected.type}</dd></div>
                <div><dt>案件号</dt><dd>{selected.claimNo || '未填写'}</dd></div>
                <div><dt>事故类型</dt><dd>{selected.accidentType || '常规维修'}</dd></div>
                <div><dt>付款方式</dt><dd>{selected.paymentMethod || '待确认'}</dd></div>
                <div><dt>维修项目</dt><dd>{selected.record}</dd></div>
                <div><dt>接待备注</dt><dd>{selected.remark || '暂无备注'}</dd></div>
              </dl>
              <div className="fee-list">
                <div><span>工时费</span><strong>{formatMoney(selected.labor)}</strong></div>
                <div><span>材料费</span><strong>{formatMoney(selected.material)}</strong></div>
                <div className="total"><span>工单金额</span><strong>{formatMoney(selected.amount)}</strong></div>
              </div>
              <div className="state-actions">
                <button onClick={() => changeStatus('在修中')}>切为在修</button>
                <button onClick={() => changeStatus('已完工')}>切为完工</button>
                <button onClick={() => changeStatus('已结算')}>完成结算</button>
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
        />
      ) : null}
    </>
  );
}

function OrderDetailDialog({ order, onClose, onEdit }) {
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
          <div><dt>车辆类型</dt><dd>{order.type}</dd></div>
          <div><dt>案件号</dt><dd>{order.claimNo || '未填写'}</dd></div>
          <div><dt>事故类型</dt><dd>{order.accidentType || '常规维修'}</dd></div>
          <div><dt>付款方式</dt><dd>{order.paymentMethod || '待确认'}</dd></div>
          <div><dt>预计交车</dt><dd>{order.delivery}</dd></div>
          <div><dt>工时费</dt><dd>{formatMoney(order.labor)}</dd></div>
          <div><dt>材料费</dt><dd>{formatMoney(order.material)}</dd></div>
          <div className="modal-wide"><dt>维修项目</dt><dd>{order.record}</dd></div>
          <div className="modal-wide"><dt>接待备注</dt><dd>{order.remark || '暂无备注'}</dd></div>
        </div>

        <footer className="modal-actions">
          <button type="button" onClick={() => window.print()}>打印工单</button>
          <button type="button" onClick={onEdit}>编辑工单</button>
        </footer>
      </section>
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
            <option>人保财险</option>
            <option>平安保险</option>
            <option>太平洋保险</option>
            <option>阳光保险</option>
          </select>
        </label>
        <label>
          车辆类型
          <select value={draft.type} onChange={(event) => updateField('type', event.target.value)}>
            <option>标的车</option>
            <option>三者车</option>
          </select>
        </label>
        <label>
          事故类型
          <select value={draft.accidentType} onChange={(event) => updateField('accidentType', event.target.value)}>
            <option>常规维修</option>
            <option>小事故</option>
            <option>保险维修</option>
            <option>钣喷维修</option>
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
          <input required value={draft.date} onChange={(event) => updateField('date', event.target.value)} placeholder="07-23" />
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

function OrderTable({ orders, onView, onEdit }) {
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
                  <button>打印</button>
                  <button>更多⌄</button>
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

function InsuranceLedger({ policies, onSavePolicy }) {
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

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(headers, rows) {
  const headerLine = headers.map((header) => csvCell(header.label)).join(',');
  const bodyLines = rows.map((row) => headers.map((header) => csvCell(header.value(row))).join(','));
  return ['\uFEFF' + headerLine, ...bodyLines].join('\r\n');
}

function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
      { label: '车辆类型', value: (row) => row.type },
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
    const csv = buildCsv(config.columns, filteredRows);
    const today = '2026-07-21';
    downloadCsv(`${config.filename}-${today}.csv`, csv);
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
        <Metric icon="order" title="当前类型" value={config.title} trend="CSV 格式" tone="blue" />
        <Metric icon="car" title="筛选记录" value={`${filteredRows.length} 条`} trend="按关键词过滤" tone="green" />
        <Metric icon="shield" title="导出字段" value={`${config.columns.length} 项`} trend="含业务字段" tone="orange" />
        <Metric icon="yuan" title="数据来源" value="本地数据" trend="localStorage" tone="blue" />
      </div>

      <section className="table-panel">
        <div className="table-titlebar">
          <h2>{config.title}导出</h2>
          <div>
            <button onClick={() => setKeyword('')}>重置</button>
            <button className="filter-primary" onClick={exportCurrentRows}>导出CSV</button>
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
          <p>预览最多显示前 8 条、前 8 个字段；导出文件会包含当前筛选结果的全部字段。</p>
        </div>
      </section>
    </section>
  );
}

function PlaceholderPage({ title, orders }) {
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
