import React, { useMemo, useState } from 'react';

const navItems = ['首页看板', '维修接待', '历史查询', '车辆保险', '客户车辆', '汇总报表', '数据导出', '系统设置'];

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
  },
];

const insuranceReminders = [
  { plate: '粤B·5J999', car: '丰田 RAV4', customer: '王女士', phone: '137****2222', traffic: '2026-07-25', commercial: '2026-07-25', remaining: '剩余4天' },
  { plate: '粤A·8K321', car: '本田 雅阁', customer: '赵先生', phone: '139****6666', traffic: '2026-07-27', commercial: '2026-07-27', remaining: '剩余6天' },
];

const insuranceRows = [
  { plate: '粤B·8A123', customer: '陈先生', car: '本田 凯美瑞', vin: 'LFV3A24G6N30***21', expiry: '2026-07-25', amount: 6520, type: '交强险 / 商业险', state: '7天内到期' },
  { plate: '粤A·3C789', customer: '李女士', car: '大众 迈腾', vin: 'LBV8W3109P0***82', expiry: '2026-08-11', amount: 7340, type: '车损 / 三者 / 座位', state: '60天内到期' },
  { plate: '粤B·7D555', customer: '刘先生', car: '大众 迈腾', vin: 'LC0CE4CD8N0***47', expiry: '2026-06-29', amount: 5100, type: '交强险 / 三者', state: '已过期' },
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

  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return repairOrders;
    return repairOrders.filter((order) =>
      [order.id, order.plate, order.customer, order.phone, order.status, order.insurer]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [query]);

  if (!isUnlocked) {
    return <AccessGate onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="sidebar-brand">
          <span className="brand-icon">车</span>
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
              <span>{navIcon(item)}</span>
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
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索客户 / 车牌 / 手机号 / 工单号"
            />
          </div>
          <button className="primary-action">＋ 新增工单</button>
          <button className="secondary-action">▣ 导出Excel</button>
          <div className="topbar-user">
            <span className="notice-dot">8</span>
            <span className="avatar" />
            <strong>陈先生</strong>
            <small>门店管理员</small>
          </div>
        </header>

        {activePage === '首页看板' && <Dashboard filteredOrders={filteredOrders} />}
        {activePage === '维修接待' && <RepairReception orders={filteredOrders} />}
        {activePage === '车辆保险' && <InsuranceLedger />}
        {!['首页看板', '维修接待', '车辆保险'].includes(activePage) && (
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
        <Metric icon="¥" title="今日产值（元）" value={formatMoney(5260)} trend="较昨日 +12.8%" tone="blue" />
        <Metric icon="车" title="今日台次（台）" value="2" trend="较昨日 +1" tone="blue" />
        <Metric icon="单" title="未结算（元）" value={formatMoney(pendingAmount + 8100)} trend="待处理 1 单" tone="orange" />
        <Metric icon="车" title="在修车辆（台）" value={repairing.toString()} trend="待处理" tone="green" />
        <Metric icon="¥" title="本月产值（元）" value={formatMoney(total + 89430)} trend="较上月 +18.6%" tone="blue" />
        <Metric icon="车" title="本月台次（台）" value="126" trend="月累计" tone="blue" />
        <Metric icon="盾" title="即将保险到期（台）" value="2" trend="7天内到期" tone="red" />
      </div>

      <section className="workflow-panel">
        <h2>维修流程概览</h2>
        <div className="workflow-grid">
          <WorkflowColumn tone="blue" title="在修（1）" order={repairOrders[0]} footer="预计交车：07-23 15:00" />
          <WorkflowColumn tone="green" title="完工（1）" order={repairOrders[1]} footer="待交车" />
          <WorkflowColumn tone="orange" title="未结算（1）" order={repairOrders[2]} footer="请及时结算" />
          <article className="workflow-card empty">
            <header><strong>结算（0）</strong><span>→</span></header>
            <div className="empty-clipboard">▤</div>
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
      <span className={`metric-icon ${tone}`}>{icon}</span>
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

function RepairReception({ orders }) {
  const selected = orders[0] || repairOrders[0];

  return (
    <section className="split-view">
      <div className="table-panel">
        <div className="table-titlebar">
          <h2>维修接待工单</h2>
          <div><button>新增工单</button><button>批量导出</button></div>
        </div>
        <OrderTable orders={orders} />
      </div>
      <aside className="detail-panel">
        <div className="detail-heading">
          <span className={`status-chip ${statusClass(selected.status)}`}>{selected.status}</span>
          <h2>{selected.plate}</h2>
          <p>{selected.customer} · {selected.phone}</p>
        </div>
        <dl>
          <div><dt>工单号</dt><dd>{selected.id}</dd></div>
          <div><dt>进厂时间</dt><dd>{selected.date} {selected.time}</dd></div>
          <div><dt>车型</dt><dd>{selected.car}</dd></div>
          <div><dt>保险公司</dt><dd>{selected.insurer}</dd></div>
          <div><dt>车辆类型</dt><dd>{selected.type}</dd></div>
          <div><dt>维修项目</dt><dd>{selected.record}</dd></div>
        </dl>
        <div className="fee-list">
          <div><span>工时费</span><strong>{formatMoney(selected.labor)}</strong></div>
          <div><span>材料费</span><strong>{formatMoney(selected.material)}</strong></div>
          <div className="total"><span>工单金额</span><strong>{formatMoney(selected.amount)}</strong></div>
        </div>
        <div className="state-actions">
          <button>切为在修</button>
          <button>切为完工</button>
          <button>完成结算</button>
        </div>
      </aside>
    </section>
  );
}

function OrderTable({ orders }) {
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
          {orders.map((order) => (
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
              <td><span className="table-actions">查看　编辑　打印　更多⌄</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsuranceLedger() {
  return (
    <section className="insurance-layout">
      <div className="quick-filters">
        <button className="active">7天内到期</button>
        <button>30天内到期</button>
        <button>已过期</button>
        <button>全部保险</button>
      </div>
      <div className="insurance-cards">
        {insuranceRows.map((row) => (
          <article key={row.vin} className="insurance-card">
            <div>
              <span className={`expiry-tag ${row.state === '已过期' ? 'expired' : ''}`}>{row.state}</span>
              <h2>{row.plate}</h2>
              <p>{row.customer} · {row.car}</p>
            </div>
            <dl>
              <div><dt>保险到期日</dt><dd>{row.expiry}</dd></div>
              <div><dt>上年投保金额</dt><dd>{formatMoney(row.amount)}</dd></div>
              <div><dt>险种</dt><dd>{row.type}</dd></div>
              <div><dt>车架号</dt><dd>{row.vin}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlaceholderPage({ title, orders }) {
  return (
    <section className="placeholder-panel">
      <h2>{title}</h2>
      <p>该页面入口已保留。后续会接入云端数据、筛选条件、汇总报表和 Excel 导出能力。</p>
      <div className="placeholder-summary">
        <Metric icon="单" title="当前筛选工单" value={orders.length.toString()} trend="模拟数据" tone="blue" />
        <Metric icon="表" title="可导出记录" value={`${orders.length + insuranceRows.length}`} trend="待接入导出" tone="green" />
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
          <span>{navIcon(tab)}</span>
          {tab}
        </button>
      ))}
    </nav>
  );
}

function navIcon(item) {
  const map = {
    首页看板: '⌂',
    维修接待: '▰',
    历史查询: '⌕',
    车辆保险: '◈',
    客户车辆: '●',
    汇总报表: '▥',
    数据导出: '⇩',
    系统设置: '⚙',
  };
  return map[item] || '•';
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
