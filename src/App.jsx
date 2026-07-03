import React, { useMemo, useState } from 'react';

const navItems = ['首页看板', '维修接待', '历史查询', '车辆保险', '客户车辆', '汇总报表', '数据导出', '系统设置'];

const repairOrders = [
  {
    id: 'WX-240701',
    date: '2026-07-01',
    plate: '浙A·8K25Q',
    customer: '陈先生',
    phone: '138****6201',
    car: '奥迪 A6L',
    insurer: '人保财险',
    type: '标的车',
    status: '在修',
    labor: 1280,
    material: 2460,
    record: '前杠喷漆、左前叶子板修复',
  },
  {
    id: 'WX-240702',
    date: '2026-07-02',
    plate: '苏E·5P91M',
    customer: '李女士',
    phone: '139****8860',
    car: '宝马 3系',
    insurer: '平安保险',
    type: '三者车',
    status: '完工',
    labor: 860,
    material: 1320,
    record: '右后门钣金、后保险杠喷漆',
  },
  {
    id: 'WX-240703',
    date: '2026-07-03',
    plate: '沪B·72N6A',
    customer: '王先生',
    phone: '136****3177',
    car: '比亚迪 汉',
    insurer: '太平洋保险',
    type: '标的车',
    status: '未结算',
    labor: 540,
    material: 980,
    record: '更换尾灯、后围板检查',
  },
  {
    id: 'WX-240704',
    date: '2026-07-03',
    plate: '浙B·16R8C',
    customer: '周女士',
    phone: '137****4502',
    car: '特斯拉 Model Y',
    insurer: '阳光保险',
    type: '三者车',
    status: '结算',
    labor: 1680,
    material: 3550,
    record: '前机盖修复、雷达校准',
  },
];

const insuranceRows = [
  { plate: '浙A·8K25Q', customer: '陈先生', car: '奥迪 A6L', vin: 'LFV3A24G6N30***21', expiry: '2026-07-18', amount: 6520, type: '交强险 / 商业险', state: '30天内到期' },
  { plate: '苏E·5P91M', customer: '李女士', car: '宝马 3系', vin: 'LBV8W3109P0***82', expiry: '2026-08-11', amount: 7340, type: '车损 / 三者 / 座位', state: '60天内到期' },
  { plate: '沪B·72N6A', customer: '王先生', car: '比亚迪 汉', vin: 'LC0CE4CD8N0***47', expiry: '2026-06-29', amount: 5100, type: '交强险 / 三者', state: '已过期' },
];

const productionTrend = [38, 52, 46, 61, 72, 66, 88, 94, 82, 105, 118, 126];
const insurerShare = [
  { name: '人保', value: 34 },
  { name: '平安', value: 27 },
  { name: '太保', value: 22 },
  { name: '其他', value: 17 },
];

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
        <div className="brand-mark">修</div>
        <h1>汽修接待与车辆保险管理</h1>
        <p>请输入门店访问码后进入系统。原型阶段使用演示访问码，正式上线后由云端接口校验。</p>
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
          <span className="brand-icon">修</span>
          <div>
            <strong>汽修云台账</strong>
            <small>接待 · 保险 · 汇总</small>
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
              {item}
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
          退出访问
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="page-kicker">门店经营台账</p>
            <h1>{activePage}</h1>
          </div>
          <div className="toolbar">
            <input type="date" defaultValue="2026-07-01" aria-label="开始日期" />
            <input type="date" defaultValue="2026-07-31" aria-label="结束日期" />
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索客户 / 车牌 / 工单"
            />
            <button className="primary-action">新增工单</button>
            <button className="secondary-action">导出Excel</button>
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

function navIcon(item) {
  const map = {
    首页看板: '□',
    维修接待: '◇',
    历史查询: '⌕',
    车辆保险: '◌',
    客户车辆: '▤',
    汇总报表: '▥',
    数据导出: '⇩',
    系统设置: '⚙',
  };
  return map[item] || '•';
}

function Dashboard({ filteredOrders }) {
  const total = filteredOrders.reduce((sum, order) => sum + order.labor + order.material, 0);
  const pending = filteredOrders.filter((order) => order.status === '未结算').length;
  const repairing = filteredOrders.filter((order) => order.status === '在修').length;

  return (
    <section className="dashboard-grid">
      <div className="metric-strip">
        <Metric title="今日产值" value={formatMoney(5260)} trend="+12.8%" />
        <Metric title="今日台次" value="2" trend="较昨日 +1" />
        <Metric title="未结算" value={pending.toString()} tone="warning" />
        <Metric title="在修车辆" value={repairing.toString()} tone="info" />
        <Metric title="本月产值" value={formatMoney(total + 88400)} trend="+18.6%" />
        <Metric title="本月台次" value="126" trend="月累计" />
        <Metric title="即将保险到期" value="2" tone="danger" />
      </div>

      <div className="chart-panel trend-panel">
        <PanelHeader title="本月产值趋势" action="按日统计" />
        <div className="bar-chart" aria-label="本月产值趋势图">
          {productionTrend.map((value, index) => (
            <span key={index} style={{ height: `${value}px` }}>
              <small>{index + 1}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="chart-panel status-panel">
        <PanelHeader title="维修状态分布" action="实时" />
        <div className="status-donut">
          <div className="donut-ring" />
          <ul>
            <li><span className="dot blue" />在修 28%</li>
            <li><span className="dot green" />完工 46%</li>
            <li><span className="dot orange" />未结算 18%</li>
            <li><span className="dot gray" />结算 8%</li>
          </ul>
        </div>
      </div>

      <div className="chart-panel share-panel">
        <PanelHeader title="保险公司送修占比" action="本月" />
        <div className="share-list">
          {insurerShare.map((item) => (
            <div key={item.name} className="share-row">
              <span>{item.name}</span>
              <div><i style={{ width: `${item.value}%` }} /></div>
              <strong>{item.value}%</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-panel cost-panel">
        <PanelHeader title="工时费 / 材料费占比" action="收入结构" />
        <div className="cost-split">
          <div>
            <span>工时费</span>
            <strong>35%</strong>
          </div>
          <div>
            <span>材料费</span>
            <strong>65%</strong>
          </div>
        </div>
      </div>

      <RecentOrders orders={filteredOrders} />
    </section>
  );
}

function Metric({ title, value, trend, tone = 'default' }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{trend || '待处理'}</small>
    </article>
  );
}

function PanelHeader({ title, action }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <button>{action}</button>
    </div>
  );
}

function RecentOrders({ orders }) {
  return (
    <section className="table-panel recent-orders">
      <PanelHeader title="近期维修工单" action="查看全部" />
      <OrderTable orders={orders} />
    </section>
  );
}

function RepairReception({ orders }) {
  const selected = orders[0] || repairOrders[0];

  return (
    <section className="split-view">
      <div className="table-panel">
        <PanelHeader title="维修接待工单" action="批量导出" />
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
          <div><dt>维修日期</dt><dd>{selected.date}</dd></div>
          <div><dt>车型</dt><dd>{selected.car}</dd></div>
          <div><dt>保险公司</dt><dd>{selected.insurer}</dd></div>
          <div><dt>车辆类型</dt><dd>{selected.type}</dd></div>
          <div><dt>维修记录</dt><dd>{selected.record}</dd></div>
        </dl>
        <div className="fee-list">
          <div><span>工时项目</span><strong>{formatMoney(selected.labor)}</strong></div>
          <div><span>领料项目</span><strong>{formatMoney(selected.material)}</strong></div>
          <div className="total"><span>合计金额</span><strong>{formatMoney(selected.labor + selected.material)}</strong></div>
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
            <th>日期</th>
            <th>工单号</th>
            <th>车牌号</th>
            <th>客户</th>
            <th>保险公司</th>
            <th>类型</th>
            <th>状态</th>
            <th>工时费</th>
            <th>材料费</th>
            <th>总金额</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.date}</td>
              <td>{order.id}</td>
              <td><strong>{order.plate}</strong></td>
              <td>{order.customer}</td>
              <td>{order.insurer}</td>
              <td>{order.type}</td>
              <td><span className={`status-chip ${statusClass(order.status)}`}>{order.status}</span></td>
              <td>{formatMoney(order.labor)}</td>
              <td>{formatMoney(order.material)}</td>
              <td>{formatMoney(order.labor + order.material)}</td>
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
        <button className="active">30天内到期</button>
        <button>60天内到期</button>
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
      <p>原型阶段先保留页面入口。后续会接入云端数据、筛选条件、汇总表和 Excel 导出。</p>
      <div className="placeholder-summary">
        <Metric title="当前筛选工单" value={orders.length.toString()} />
        <Metric title="可导出记录" value={`${orders.length + insuranceRows.length}`} />
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
          {tab.replace('首页', '首页')}
        </button>
      ))}
    </nav>
  );
}

function statusClass(status) {
  return {
    在修: 'repairing',
    完工: 'done',
    结算: 'settled',
    未结算: 'pending',
  }[status] || 'pending';
}

export default App;
