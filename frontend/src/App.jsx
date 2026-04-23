import React, { useEffect, useMemo, useRef, useState } from 'react'
import Papa from 'papaparse';
import Modal from './components/Modal.jsx'
import {
  apiRegister,
  apiLogin,
  apiGetLeads,
  apiCreateLead,
  apiSetStatus,
  apiDeleteLead,
  apiGetAnalytics,
  apiMe,
  apiGetTeam,
  apiAddMember,
  apiUploadBase,
  apiUpgradeToLead,
  apiAddTeamLead,
  apiUpdateDeadline
} from './api.js'



const STATUS_LIST = ['New', 'Contacted', 'Briefing', 'Proposal', 'Won', 'Lost']

const STATUS_COLORS = {
  New: '#6b7280',
  Contacted: '#3b82f6',
  Briefing: '#8b5cf6',
  Proposal: '#f59e0b',
  Won: '#10b981',
  Lost: '#ef4444'
}

const EMPTY_TEAM_STATE = { team: null, members: [], teams: [] }
const EMPTY_LEAD_FORM = { name: '', phone: '', email: '', socials: '', source: '', clientRequest: '' }
const EMPTY_MEMBER_FORM = { email: '', password: '', role: 'member' }
const EMPTY_TEAM_LEAD_FORM = { email: '', password: '', teamName: '' }

const UI = {
  uk: {
    login: 'Увійти', register: 'Реєстрація', logout: 'Вийти',
    dashboard: 'Панель', crm: 'Завдання', analytics: 'Аналітика', team: 'Команда', admin: 'Адмін',
    email: 'Email', password: 'Пароль', role: 'Роль',
    user: 'Користувач', teamLead: 'Лідер команди', member: 'Учасник',
    teamName: 'Назва команди', registerBtn: 'Зареєструватися',
    account: 'Акаунт', noTeam: 'Команди поки немає',
    addLead: 'Додати запис', leadName: 'Назва / клієнт / завдання', phone: 'Номер телефону (необов’язково)',
    emailField: 'Email', socials: 'Соцмережі(Telegram, Instagram та інші)', source: 'Джерело(звідки клієнт дізнався про нас)', clientRequest: 'Опис',
    allStatuses: 'Усі статуси',
    totalLeads: 'Усього записів', teamMembers: 'Учасники команди', wonDeals: 'Успішно', lostDeals: 'Втрачено',
    byStatus: 'За статусами', bySource: 'За джерелами',
    members: 'Учасники', addMember: 'Додати учасника', addTeamLead: 'Додати лідера команди',
    teams: 'Команди', createOwnTeam: 'Створити свою команду', createOwnTeamText: 'Якщо хочеш створити свою команду, введи назву та натисни кнопку нижче.',
    becomeLead: 'Стати лідером команди',
    uploadBase: 'Завантажити базу (.csv)', uploadBaseTeam: 'Завантажити базу для моєї команди (.csv)',
    selectTeam: 'Обери команду', replaceBase: 'Нова база замінить старі записи вибраної команди.',
    leadInfo: 'Інформація про запис', deleteLead: 'Видалити запис',
    name: 'назва', phoneLower: 'номер', emailLower: 'email', socialsLower: 'соцмережі', sourceLower: 'джерело',
    statusLower: 'статус', requestLower: 'опис', createdLower: 'створено', deadlineLower: 'термін',
    saveDeadline: 'Зберегти термін', noDeadline: 'Без терміну',
    invalidPhone: 'Некоректний номер телефону',
    createdTeamLead: 'Лідера команди створено', upgraded: 'Тепер ти лідер команди. Перезаходити не потрібно.',
    uploaded: 'SQLite базу завантажено',
    message: 'Повідомлення', error: 'Помилка', ready: 'Готово', confirm: 'Підтвердження', yes: 'Так', no: 'Ні',
    deleteConfirm: 'Видалити запис?', uploadConfirm: 'Завантаження бази замінить поточні записи вибраної команди. Продовжити?',
    fillEmailPassword: 'Введи email і пароль',
    statusLabels: { New: 'Нова', Contacted: 'Зв’язались', Briefing: 'Бриф', Proposal: 'Пропозиція', Won: 'Успішно', Lost: 'Втрачено' }
  },
  en: {
    login: 'Login', register: 'Register', logout: 'Logout',
    dashboard: 'Dashboard', crm: 'Tasks', analytics: 'Analytics', team: 'Team', admin: 'Admin',
    email: 'Email', password: 'Password', role: 'Role',
    user: 'User', teamLead: 'Team Leader', member: 'Member',
    teamName: 'Team name', registerBtn: 'Create account',
    account: 'Account', noTeam: 'No team yet',
    addLead: 'Add entry', leadName: 'Title / client / task', phone: 'Phone number (optional)',
    emailField: 'Email', socials: 'Social media (Telegram, Instagram, etc.) ', source: 'Source (how the client found out about us)', clientRequest: 'Description',
    allStatuses: 'All statuses',
    totalLeads: 'Total entries', teamMembers: 'Team members', wonDeals: 'Won', lostDeals: 'Lost',
    byStatus: 'By status', bySource: 'By source',
    members: 'Members', addMember: 'Add member', addTeamLead: 'Add team leader',
    teams: 'Teams', createOwnTeam: 'Create your own team', createOwnTeamText: 'Enter a team name and use the button below.',
    becomeLead: 'Become team leader',
    uploadBase: 'Upload base (.csv)', uploadBaseTeam: 'Upload base for my team (.csv)',
    selectTeam: 'Select team', replaceBase: 'The new base will replace old entries for the selected team.',
    leadInfo: 'Entry details', deleteLead: 'Delete entry',
    name: 'title', phoneLower: 'phone', emailLower: 'email', socialsLower: 'socials', sourceLower: 'source',
    statusLower: 'status', requestLower: 'description', createdLower: 'created', deadlineLower: 'deadline',
    saveDeadline: 'Save deadline', noDeadline: 'No deadline',
    invalidPhone: 'Invalid phone number',
    createdTeamLead: 'Team leader created', upgraded: 'You are now a team leader. No relog needed.',
    uploaded: 'SQLite base uploaded',
    message: 'Message', error: 'Error', ready: 'Done', confirm: 'Confirm', yes: 'Yes', no: 'No',
    deleteConfirm: 'Delete this entry?', uploadConfirm: 'Uploading the base will replace current entries for the selected team. Continue?',
    fillEmailPassword: 'Enter email and password',
    statusLabels: { New: 'New', Contacted: 'Contacted', Briefing: 'Briefing', Proposal: 'Proposal', Won: 'Won', Lost: 'Lost' }
  }
}



//func
function isValidPhone(value) {
  const phone = normalizePhone(value)
  if (!phone) return true
  return /^\+?\d{10,15}$/.test(phone)
}

function formatDateInput(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getRoleLabel(role, t) {
  if (role === 'admin') return t.admin
  if (role === 'team_lead') return t.teamLead
  if (role === 'member') return t.member
  return t.user
}

function BarChart({ data }) {
  const entries = Object.entries(data || {})
  const maxValue = Math.max(1, ...entries.map(([, value]) => Number(value) || 0))

  return (
    <div className="analytics-bars">
      {entries.map(([label, value]) => {
        const width = Math.round(((Number(value) || 0) / maxValue) * 100)

        return (
          <div key={label} className="analytics-bar-row">
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
            <div className="analytics-bar-track">
              <div className="analytics-bar-fill" style={{ width: `${width}%` }} />
            </div>
            <div style={{ textAlign: 'right' }}>{value}</div>
          </div>
        )
      })}
    </div>
  )
}

function StatusButtons({ current, onChange, disabled = false, labels }) {
  return (
    <div
      className="status-buttons"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '8px',
        width: '100%',
        marginTop: '8px',
        alignItems: 'stretch'
      }}
    >
      {STATUS_LIST.map((status) => {
        const isActive = current === status
        const color = STATUS_COLORS[status]

        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => onChange(status)}
            style={{
              background: isActive ? color : '#1a1a1a',
              color: '#fff',
              border: `2px solid ${color}`,
              opacity: disabled ? 0.45 : (isActive ? 1 : 0.72),
              padding: '6px 10px',
              borderRadius: '10px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              width: '100%',
              minHeight: '42px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {labels[status] || status}
          </button>
        )
      })}
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(null)
  const [profile, setProfile] = useState(null)
  const [teamData, setTeamData] = useState(EMPTY_TEAM_STATE)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [authMode, setAuthMode] = useState('login')
  const [registerRole, setRegisterRole] = useState('user')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [teamName, setTeamName] = useState('')
  const [lang, setLang] = useState('uk')

  const [leadForm, setLeadForm] = useState(EMPTY_LEAD_FORM)
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER_FORM)
  const [teamLeadForm, setTeamLeadForm] = useState(EMPTY_TEAM_LEAD_FORM)
  const [upgradeTeamName, setUpgradeTeamName] = useState('')
  const [selectedAdminTeamId, setSelectedAdminTeamId] = useState('')
  const [deadlineValue, setDeadlineValue] = useState('')

  const [leads, setLeads] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalBody, setModalBody] = useState(null)
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef(null)

  const t = UI[lang]
  const userRole = profile?.user?.role
  const isAdmin = userRole === 'admin'
  const isTeamLead = userRole === 'team_lead'
  const isMember = userRole === 'member' || userRole === 'user'
  const canEditDeadline = isAdmin || isTeamLead

  const selectedLead = useMemo(() => {
    return leads.find((lead) => String(lead.id) === String(selectedLeadId)) || null
  }, [leads, selectedLeadId])

  const toggleLeadSelection = (id) => {

  };
  
  const filteredLeads = useMemo(() => {
    if (statusFilter === 'all') return leads
    return leads.filter((lead) => lead.status === statusFilter)
  }, [leads, statusFilter])

  const dashboardCards = useMemo(() => {
    return [
      { title: t.totalLeads, value: analytics?.totalLeads ?? 0 },
      { title: t.teamMembers, value: analytics?.teamMembers ?? 0 },
      { title: t.wonDeals, value: analytics?.byStatus?.Won ?? 0 },
      { title: t.lostDeals, value: analytics?.byStatus?.Lost ?? 0 }
    ]
  }, [analytics, t])

  function showMessage(message, title = t.message) {
    setModalTitle(title)
    setModalBody(<p>{message}</p>)
    setModalOpen(true)
  }

  function showConfirm(message, onYes, title = t.confirm) {
    setModalTitle(title)
    setModalBody(
      <div>
        <p>{message}</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={async () => {
              setModalOpen(false)
              await onYes?.()
            }}
          >
            {t.yes}
          </button>
          <button type="button" onClick={() => setModalOpen(false)}>{t.no}</button>
        </div>
      </div>
    )
    setModalOpen(true)
  }

  async function loadAll() {
    if (!token) return

    const [me, leadsData, analyticsData, team] = await Promise.all([
      apiMe(token),
      apiGetLeads(token),
      apiGetAnalytics(token),
      apiGetTeam(token)
    ])

    setProfile(me)
    setLeads(Array.isArray(leadsData) ? leadsData : [])
    setAnalytics(analyticsData)
    setTeamData(team || EMPTY_TEAM_STATE)

    if (me?.user?.role === 'admin' && !selectedAdminTeamId && team?.teams?.length) {
      setSelectedAdminTeamId(String(team.teams[0].Id))
    }
  }

  useEffect(() => {
    if (!token) return
    loadAll()
  }, [token])

  useEffect(() => {
    if (!token) return
    loadAll()
  }, [activeTab])

  async function onAuthSubmit(event) {
    event.preventDefault()

    try {
      const data = authMode === 'register'
        ? await apiRegister(authEmail, authPassword, registerRole, teamName)
        : await apiLogin(authEmail, authPassword)

      setToken(data.token)
      setActiveTab('dashboard')
    } catch (error) {
      showMessage(error?.message || t.error, t.error)
    }
  }

async function onAddLead(event) {
    event.preventDefault();
    console.log("🚀 Шаг 1: Кнопка нажата, начинаем...");

    try {
      if (!leadForm.name.trim()) {
        console.log("❌ Ошибка: Имя пустое");
        showMessage(t.error, t.error);
        return;
      }

      if (!isValidPhone(leadForm.phone)) {
        console.log("❌ Ошибка: Телефон не прошел проверку");
        showMessage(t.invalidPhone, t.error);
        return;
      }

      console.log("✅ Шаг 2: Проверки пройдены, собираем данные...");
      const payload = {
        name: leadForm.name,
        phone: normalizePhone(leadForm.phone), 
        email: leadForm.email,
        socials: leadForm.socials,
        source: leadForm.source,
        clientRequest: leadForm.clientRequest
      };

      console.log("⏳ Шаг 3: Отправляем в базу данных...", payload);
      const result = await apiCreateLead(token, payload);

      if (!result.ok) {
        console.log("❌ Ошибка от базы данных:", result);
        showMessage(result.data?.message || t.error, t.error);
        return;
      }

      console.log("✅ Шаг 4: База ответила ОК, стучимся в Телеграм...");
      const TELEGRAM_TOKEN = '8715687458:AAFVD0Vc5WGEoMthyJZIQJprigMJTA5FdoU'; 
      const CHAT_ID = '731859824'; 
      const message = `🔥 *Новий лід у CRM!*\n👤 *Ім'я:* ${leadForm.name}\n📱 *Телефон:* ${leadForm.phone || 'Не вказано'}\n📝 *Запит:* ${leadForm.clientRequest || 'Немає'}`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: CHAT_ID, 
          text: message,
          parse_mode: 'Markdown'
        })
      }).then(() => console.log("✅ Шаг 5: Телеграм отправлен!"))
        .catch(err => console.log("❌ Ошибка ТГ:", err));

      console.log("🧹 Шаг 6: Очищаем форму и обновляем список...");
      setLeadForm({ name: '', phone: '', email: '', socials: '', source: '', clientRequest: '' });
      await loadAll();
      
      console.log("🎉 ВСЁ УСПЕШНО ЗАВЕРШЕНО!");

    } catch (error) {
      console.error("🚨 КРИТИЧЕСКАЯ ОШИБКА В КОДЕ:", error);
    }
  }
  
  async function onAddMember(event) {
    event.preventDefault()

    if (!memberForm.email || !memberForm.password) {
      showMessage(t.fillEmailPassword, t.error)
      return
    }

    const result = await apiAddMember(token, memberForm)
    if (!result.ok) {
      showMessage(result.data?.message || t.error, t.error)
      return
    }

    setMemberForm(EMPTY_MEMBER_FORM)
    await loadAll()
  }

  async function onAddTeamLead(event) {
    event.preventDefault()

    const result = await apiAddTeamLead(token, teamLeadForm)
    if (!result.ok) {
      showMessage(result.data?.message || t.error, t.error)
      return
    }

    setTeamLeadForm(EMPTY_TEAM_LEAD_FORM)
    await loadAll()
    showMessage(t.createdTeamLead, t.ready)
  }

  async function onUpgradeToLead() {
    const result = await apiUpgradeToLead(token, upgradeTeamName)
    if (!result.ok) {
      showMessage(result.data?.message || t.error, t.error)
      return
    }

    setUpgradeTeamName('')
    await loadAll()
    showMessage(t.upgraded, t.ready)
  }

  function askUploadBase() {
    fileInputRef.current?.click()
  }

async function onBaseFileChosen(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; 

    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const leadsArray = results.data;

        const formattedLeads = leadsArray.map(item => ({
          name: item.name || item.Name || item['Имя'] || item['ФИО'] || item['Назва'] || 'Без имени',
          phone: item.phone || item.Phone || item['Телефон'] || item['Номер'] || '',
          email: item.email || item.Email || item['Почта'] || '',
          socials: item.socials || item.Socials || item['Соцсети'] || item['Соцмережі'] || '', 
          source: item.source || item.Source || item['Источник'] || item['Джерело'] || 'Импорт CSV',
          status: item.status || item.Status || item['Статус'] || 'New',
          clientRequest: item.clientRequest || item.ClientRequest || item.description || item.Description || item.request || item['Запрос'] || item['Опис'] || '' 
        }));

        try {
          const response = await fetch('https://crmbaseee.onrender.com/leads/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ 
              leadsArray: formattedLeads,
              targetTeamId: isAdmin ? selectedAdminTeamId : undefined})
          });
          
          const data = await response.json();
          if (data.ok) {
            showMessage(`Успішно завантажено лідів: ${data.importedCount}`, t.ready);
            await loadAll(); 
          } else {
            showMessage(`Помилка: ${data.message}`, t.error);
          }
        } catch (err) {
          console.error('Ошибка импорта:', err);
          showMessage('Не вдалося імпортувати базу. Перевір консоль.', t.error);
        }
      }
    });
  }
  function openLeadInfo(id) {
    const lead = leads.find((item) => String(item.id) === String(id))

    setSelectedLeadId(id)
    setDeadlineValue(formatDateInput(lead?.deadline))
    setModalTitle(t.leadInfo)
    setModalBody(null)
    setModalOpen(true)
  }

  async function onSaveDeadline() {
    if (!selectedLead) return

    const result = await apiUpdateDeadline(token, selectedLead.id, deadlineValue || null)
    if (!result.ok) {
      showMessage(result.data?.message || t.error, t.error)
      return
    }

    await loadAll()
    setDeadlineValue(formatDateInput(deadlineValue))
    showMessage(t.ready, t.ready)
  }

  function renderDashboard() {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '15px' }}>
          {dashboardCards.map((card) => (
            <div key={card.title} style={{ border: '1px solid #2b2b2b', borderRadius: '16px', padding: '14px', background: '#171717' }}>
              <div style={{ opacity: 0.75, marginBottom: '6px' }}>{card.title}</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{card.value}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

function renderCrm() {
  return (
    <div id="crm-block"> 
      <div style={{ marginBottom: '15px' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">{t.allStatuses}</option>
          {STATUS_LIST.map((s) => <option key={s} value={s}>{t.statusLabels[s] || s}</option>)}
        </select>
      </div>

      <form id="lead-form" onSubmit={onAddLead} style={{ marginBottom: '20px' }}>
        <input name="name" placeholder={t.leadName} required value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} />
        <input name="phone" placeholder={t.phone} value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} />
        <input type="email" name="email" placeholder={t.emailField} value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} />
        <input name="socials" placeholder={t.socials} value={leadForm.socials} onChange={(e) => setLeadForm({ ...leadForm, socials: e.target.value })} />
        <input name="source" placeholder={t.source} value={leadForm.source} onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })} />
        <input name="clientRequest" placeholder={t.clientRequest} value={leadForm.clientRequest} onChange={(e) => setLeadForm({ ...leadForm, clientRequest: e.target.value })} />
        <button type="submit">{t.addLead}</button>
      </form>


      <div id="leads-container">
        {filteredLeads.map((lead) => (
          <div
            key={lead.id}
            style={{
              marginBottom: '14px',
              borderBottom: '1px solid #2b2b2b',
              paddingBottom: '12px',
              display: 'grid',
              gridTemplateColumns: '1fr auto', 
              gap: '15px',
              alignItems: 'center'
            }}
          >
            <div onClick={() => openLeadInfo(lead.id)} style={{ cursor: 'pointer' }}>
              <span style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{lead.name}</span>
              <div style={{ fontSize: '12px', color: '#888' }}>({t.statusLabels[lead.status] || lead.status})</div>
            </div>

            <StatusButtons current={lead.status} onChange={(status) => onSetStatus(lead.id, status)} labels={t.statusLabels} />
          </div>
        ))}
      </div>
    </div>
  )
}
  function renderAnalytics() {
    return (
      <div>
        <p><strong>{t.totalLeads}:</strong> {analytics?.totalLeads || 0}</p>
        <h3>{t.byStatus}</h3>
        <BarChart data={analytics?.byStatus || {}} />
        <h3 style={{ marginTop: '18px' }}>{t.bySource}</h3>
        <BarChart data={analytics?.bySource || {}} />
      </div>
    )
  }

  function renderTeam() {
    if (isAdmin) {
      return (
        <div>
          <h3>{t.team}</h3>

          <h3>{t.addTeamLead}</h3>
          <form onSubmit={onAddTeamLead}>
            <input type="email" placeholder={t.email} value={teamLeadForm.email} onChange={(event) => setTeamLeadForm((prev) => ({ ...prev, email: event.target.value }))} />
            <input type="password" placeholder={t.password} value={teamLeadForm.password} onChange={(event) => setTeamLeadForm((prev) => ({ ...prev, password: event.target.value }))} />
            <input placeholder={t.teamName} value={teamLeadForm.teamName} onChange={(event) => setTeamLeadForm((prev) => ({ ...prev, teamName: event.target.value }))} />
            <button type="submit">{t.addTeamLead}</button>
          </form>

          <h3 style={{ marginTop: '18px' }}>{t.teams}</h3>
          {(teamData.teams || []).map((team) => (
            <p key={team.Id}><strong>#{team.Id}</strong> {team.Name} — lead: {team.LeadEmail || 'n/a'}</p>
          ))}
        </div>
      )
    }

    return (
      <div>
        <h3>{t.team}</h3>

        {teamData.team ? (
          <div style={{ marginBottom: '12px' }}>
            <p><strong>{t.teamName}:</strong> {teamData.team.Name}</p>
          </div>
        ) : (
          <p>{t.noTeam}</p>
        )}

        <h3>{t.members}</h3>
        {(teamData.members || []).map((member) => (
          <p key={member.id}><strong>{member.email}</strong> — {getRoleLabel(member.role, t)}</p>
        ))}

        {isTeamLead ? (
          <>
            <h3 style={{ marginTop: '18px' }}>{t.addMember}</h3>
            <form onSubmit={onAddMember}>
              <input type="email" placeholder={t.email} value={memberForm.email} onChange={(event) => setMemberForm((prev) => ({ ...prev, email: event.target.value }))} />
              <input type="password" placeholder={t.password} value={memberForm.password} onChange={(event) => setMemberForm((prev) => ({ ...prev, password: event.target.value }))} />
              <select value={memberForm.role} onChange={(event) => setMemberForm((prev) => ({ ...prev, role: event.target.value }))}>
                <option value="member">{t.member}</option>
               
              </select>
              <button type="submit">{t.addMember}</button>
            </form>
          </>
        ) : null}

        {isMember ? (
          <div style={{ marginTop: '18px' }}>
            <h3>{t.createOwnTeam}</h3>
            <p>{t.createOwnTeamText}</p>
            <input placeholder={t.teamName} value={upgradeTeamName} onChange={(event) => setUpgradeTeamName(event.target.value)} />
            <button type="button" onClick={onUpgradeToLead}>{t.becomeLead}</button>
          </div>
        ) : null}
      </div>
    )
  }

  function renderAdmin() {
    return (
      <div>
        <h3>{t.admin}</h3>
        <div style={{ marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={selectedAdminTeamId} onChange={(event) => setSelectedAdminTeamId(event.target.value)}>
            <option value="">{t.selectTeam}</option>
            {(teamData.teams || []).map((team) => (
              <option key={team.Id} value={team.Id}>{team.Name} — lead: {team.LeadEmail || 'n/a'}</option>
            ))}
          </select>
          <button type="button" onClick={askUploadBase}>{t.uploadBase}</button>
        </div>
        <p className="helper-text">{t.replaceBase}</p>
      </div>
    )
  }

  function renderLeadModal() {
    if (!selectedLead || modalTitle !== t.leadInfo) {
      return modalBody
    }

    return (
      <div>
        <p><strong>{t.name}:</strong> {selectedLead.name}</p>
        <p><strong>{t.phoneLower}:</strong> {selectedLead.phone || '—'}</p>
        <p><strong>{t.emailLower}:</strong> {selectedLead.email || '—'}</p>
        <p><strong>{t.socialsLower}:</strong> {selectedLead.socials || '—'}</p>
        <p><strong>{t.sourceLower}:</strong> {selectedLead.source || '—'}</p>
        <p><strong>{t.statusLower}:</strong> {t.statusLabels[selectedLead.status] || selectedLead.status}</p>
        <p><strong>{t.requestLower}:</strong> {selectedLead.clientRequest || '—'}</p>

        <StatusButtons current={selectedLead.status} onChange={(status) => onSetStatus(selectedLead.id, status)} labels={t.statusLabels} />

        {canEditDeadline ? (
          <div style={{ display: 'none' }}>
            <input type="date" value={deadlineValue} onChange={(event) => setDeadlineValue(event.target.value)} />
            <button type="button" onClick={onSaveDeadline}>{t.saveDeadline}</button>
          </div>
        ) : null}

        <button id="delete-btn" style={{ marginTop: '10px' }} type="button" onClick={() => onDeleteLead(selectedLead.id)}>
          {t.deleteLead}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px' }}>
        <button type="button" onClick={() => setLang('uk')}>UKR</button>
        <button type="button" onClick={() => setLang('en')}>EN</button>
      </div>

      <div id="login-block" style={{ display: token ? 'none' : 'block' }}>
        <h2>CRM</h2>

        <form onSubmit={(event) => event.preventDefault()} style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setAuthMode('login')}>{t.login}</button>
          <button type="button" onClick={() => setAuthMode('register')}>{t.register}</button>
        </form>

        <form id="login-form" onSubmit={onAuthSubmit}>
          <input type="email" placeholder={t.email} required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
          <br />
          <input type="password" placeholder={t.password} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
          <br />

          {authMode === 'register' ? (
            <>
              <select value={registerRole} onChange={(event) => setRegisterRole(event.target.value)}>
                <option value="user">{t.user}</option>
                <option value="team_lead">{t.teamLead}</option>
              </select>

              {registerRole === 'team_lead' ? (
                <>
                  <br />
                  <input placeholder={t.teamName} value={teamName} onChange={(event) => setTeamName(event.target.value)} />
                </>
              ) : null}

              <br />
            </>
          ) : null}

          <button type="submit">{authMode === 'register' ? t.registerBtn : t.login}</button>
        </form>

        <div style={{ marginTop: '16px', opacity: 0.8 }}>
          <p>{t.demo}</p>
        </div>
      </div>

      <div id="crm-block" style={{ display: token ? 'block' : 'none' }}>
        <h2>CRM</h2>

        <form onSubmit={(event) => event.preventDefault()} style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setActiveTab('dashboard')}>{t.dashboard}</button>
          <button type="button" onClick={() => setActiveTab('crm')}>{t.crm}</button>
          <button type="button" onClick={() => setActiveTab('analytics')}>{t.analytics}</button>
          {(isTeamLead || isAdmin || isMember) ? <button type="button" onClick={() => setActiveTab('team')}>{t.team}</button> : null}
          {isAdmin ? <button type="button" onClick={() => setActiveTab('admin')}>{t.admin}</button> : null}
          <button
            type="button"
            onClick={() => {
              setToken(null)
              setProfile(null)
              setActiveTab('dashboard')
            }}
          >
            {t.logout}
          </button>
        </form>

        <div className="helper-text" style={{ marginBottom: '10px' }}>
          <strong>{t.account}:</strong> {profile?.user?.email || '-'} | <strong>{t.role}:</strong> {getRoleLabel(profile?.user?.role, t)} {profile?.team ? `| ${t.team}: ${profile.team.Name}` : ''}
        </div>

        {activeTab === 'dashboard' ? renderDashboard() : null}
        {activeTab === 'crm' ? renderCrm() : null}
        {activeTab === 'analytics' ? renderAnalytics() : null}
        {activeTab === 'team' ? renderTeam() : null}
        {activeTab === 'admin' ? renderAdmin() : null}

        {isTeamLead && activeTab !== 'admin' ? (
          <div style={{ marginTop: '14px' }}>
            <button type="button" onClick={askUploadBase}>{t.uploadBaseTeam}</button>
          </div>
        ) : null}

        <input ref={fileInputRef} type="file" accept=".sqlite,.db" style={{ display: 'none' }} onChange={onBaseFileChosen} />
      </div>

      <Modal open={modalOpen} title={modalTitle} onClose={() => setModalOpen(false)}>
        {renderLeadModal()}
      </Modal>
    </div>
  )
}
