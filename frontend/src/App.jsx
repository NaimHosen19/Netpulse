import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Clock3, Network, Search, Plus, Trash2, RefreshCw, Upload, Menu, LayoutDashboard, RadioTower, FileBarChart } from 'lucide-react'

const API = 'http://localhost:8000/api'

function StatCard({ icon: Icon, label, value, note, tone }) {
  return <div className="stat-card">
    <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
    <div><p className="stat-label">{label}</p><h2>{value}</h2><span className="stat-note">{note}</span></div>
  </div>
}

export default function App() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), site_id: '', location: '', issue: 'Fiber Cut', downtime_hours: 1, team: 'Team A', status: 'Resolved', description: '' })

  async function loadData() {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/incidents`)
      if (!res.ok) throw new Error('API request failed')
      setIncidents(await res.json())
    } catch {
      setError('Backend-এর সাথে সংযোগ হচ্ছে না। Backend server চালু আছে কি না দেখুন।')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const totalDowntime = incidents.reduce((sum, row) => sum + Number(row.downtime_hours || 0), 0)
  const avgDowntime = incidents.length ? totalDowntime / incidents.length : 0
  const openCount = incidents.filter(x => x.status === 'Open').length
  const fiberCount = incidents.filter(x => x.issue === 'Fiber Cut').length

  const issueStats = useMemo(() => {
    const result = {}
    incidents.forEach(x => { result[x.issue] = (result[x.issue] || 0) + Number(x.downtime_hours || 0) })
    return Object.entries(result).sort((a,b) => b[1] - a[1])
  }, [incidents])
  const maxIssue = Math.max(1, ...issueStats.map(x => x[1]))

  const filtered = incidents.filter(x =>
    [x.id, x.site_id, x.location, x.issue, x.team, x.status].join(' ').toLowerCase().includes(search.toLowerCase())
  )

  async function addIncident(e) {
    e.preventDefault()
    try {
      const res = await fetch(`${API}/incidents`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, downtime_hours: Number(form.downtime_hours) })
      })
      if (!res.ok) throw new Error()
      setShowForm(false)
      setForm({ date: new Date().toISOString().slice(0,10), site_id: '', location: '', issue: 'Fiber Cut', downtime_hours: 1, team: 'Team A', status: 'Resolved', description: '' })
      loadData()
    } catch { setError('Incident save করা যায়নি। আবার চেষ্টা করুন।') }
  }

  async function deleteIncident(id) {
    if (!window.confirm(`${id} delete করবেন?`)) return
    try { await fetch(`${API}/incidents/${id}`, { method: 'DELETE' }); loadData() }
    catch { setError('Delete করা যায়নি।') }
  }

  async function uploadCsv(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const body = new FormData(); body.append('file', file)
    try {
      const res = await fetch(`${API}/incidents/upload`, { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      await loadData(); alert(`${data.rows} rows uploaded`)
    } catch (err) { setError(err.message) }
    e.target.value = ''
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Network size={22}/></div><div><b>NetPulse</b><small>TELECOM ANALYTICS</small></div></div>
      <div className="nav-caption">WORKSPACE</div>
      <a className="nav-item active"><LayoutDashboard size={18}/> Overview</a>
      <a className="nav-item"><RadioTower size={18}/> Network Incidents</a>
      <a className="nav-item"><FileBarChart size={18}/> Reports</a>
      <div className="sidebar-bottom"><div className="online-dot"></div><span>Local CSV storage</span><small>Version 0.1.0</small></div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div><div className="breadcrumb">Workspace / <b>Overview</b></div><h1>Network Overview</h1><p>Monitor incidents, downtime and maintenance performance.</p></div>
        <div className="top-actions"><span className="system-status"><i/> System connected</span><button className="icon-button" onClick={loadData} title="Refresh"><RefreshCw size={17}/></button></div>
      </header>

      {error && <div className="error-banner">{error}</div>}
      <section className="stats-grid">
        <StatCard icon={AlertTriangle} label="Total incidents" value={incidents.length} note="All recorded incidents" tone="orange"/>
        <StatCard icon={Clock3} label="Total downtime" value={`${totalDowntime.toFixed(1)}h`} note="Combined service downtime" tone="blue"/>
        <StatCard icon={Activity} label="Average downtime" value={`${avgDowntime.toFixed(1)}h`} note="Per incident" tone="purple"/>
        <StatCard icon={Network} label="Fiber cut incidents" value={fiberCount} note={`${openCount} currently open`} tone="green"/>
      </section>

      <section className="content-grid">
        <div className="panel chart-panel">
          <div className="panel-heading"><div><h3>Downtime by issue</h3><p>Total downtime hours grouped by incident type</p></div><span className="subtle-tag">Hours</span></div>
          {issueStats.length ? <div className="bar-chart">{issueStats.map(([name,value]) => <div className="bar-row" key={name}><span>{name}</span><div className="bar-track"><div className="bar-fill" style={{width: `${value/maxIssue*100}%`}}/></div><b>{value}h</b></div>)}</div> : <div className="empty-state">No incident data available</div>}
        </div>
        <div className="panel insight-panel">
          <div className="panel-heading"><div><h3>Operations snapshot</h3><p>Quick maintenance indicators</p></div></div>
          <div className="insight-line"><span>Open incidents</span><b className={openCount ? 'warning-text' : ''}>{openCount}</b></div>
          <div className="insight-line"><span>Resolved incidents</span><b>{incidents.filter(x => x.status === 'Resolved').length}</b></div>
          <div className="insight-line"><span>Highest downtime</span><b>{incidents.length ? `${Math.max(...incidents.map(x => Number(x.downtime_hours || 0)))}h` : '0h'}</b></div>
          <div className="insight-callout"><Activity size={17}/><span>Use incident records to identify recurring network problems and improve restoration performance.</span></div>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="table-toolbar"><div><h3>Recent incidents</h3><p>Review and manage network maintenance records</p></div><div className="toolbar-actions">
          <label className="secondary-button upload-button"><Upload size={15}/> Import CSV<input type="file" accept=".csv" onChange={uploadCsv}/></label>
          <button className="primary-button" onClick={() => setShowForm(!showForm)}><Plus size={16}/> Add incident</button>
        </div></div>

        {showForm && <form className="incident-form" onSubmit={addIncident}>
          <input required placeholder="Site ID (e.g. CTG011)" value={form.site_id} onChange={e=>setForm({...form,site_id:e.target.value})}/>
          <input placeholder="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/>
          <select value={form.issue} onChange={e=>setForm({...form,issue:e.target.value})}><option>Fiber Cut</option><option>Power Failure</option><option>Equipment Fault</option><option>Transmission Issue</option><option>Other</option></select>
          <input type="number" min="0" step="0.1" required value={form.downtime_hours} onChange={e=>setForm({...form,downtime_hours:e.target.value})} placeholder="Downtime hours"/>
          <select value={form.team} onChange={e=>setForm({...form,team:e.target.value})}><option>Team A</option><option>Team B</option><option>Team C</option></select>
          <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Resolved</option><option>Open</option></select>
          <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
          <input className="description-input" placeholder="Description (optional)" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
          <button className="primary-button" type="submit">Save incident</button>
        </form>}

        <div className="table-search"><Search size={16}/><input placeholder="Search site, issue, team or status..." value={search} onChange={e=>setSearch(e.target.value)}/><span>{filtered.length} records</span></div>
        <div className="table-wrap"><table><thead><tr><th>Incident ID</th><th>Date</th><th>Site / Location</th><th>Issue type</th><th>Downtime</th><th>Team</th><th>Status</th><th></th></tr></thead>
          <tbody>{loading ? <tr><td colSpan="8" className="empty-state">Loading incidents...</td></tr> : filtered.map(row=><tr key={row.id}><td className="id-cell">{row.id}</td><td>{row.date}</td><td><b>{row.site_id}</b><small className="cell-sub">{row.location}</small></td><td>{row.issue}</td><td><b>{Number(row.downtime_hours).toFixed(1)}h</b></td><td>{row.team}</td><td><span className={`status ${row.status === 'Open' ? 'status-open' : 'status-resolved'}`}>{row.status}</span></td><td><button className="delete-button" onClick={()=>deleteIncident(row.id)} title="Delete"><Trash2 size={15}/></button></td></tr>)}
          {!loading && filtered.length === 0 && <tr><td colSpan="8" className="empty-state">No matching incidents found</td></tr>}</tbody>
        </table></div>
        <div className="table-footer">Showing {filtered.length} of {incidents.length} incidents <span>Data source: backend/data/incidents.csv</span></div>
      </section>
      <footer>NetPulse Telecom Analytics <span>Built with React · FastAPI · Pandas · CSV</span></footer>
    </main>
  </div>
}
