const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const connectDB = require('./db');
const auth = require('./auth');
const leads = require('./leads');
const User = require('./User'); 

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());

// --- АВТОРИЗАЦИЯ ---
app.post('/auth/register', auth.register());
app.post('/auth/login', auth.login());

app.get('/me', auth.authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const userTeamId = user.role === 'team_lead' ? user._id.toString() : (user.teamId || null);
    res.json({
      user: { id: user._id.toString(), email: user.email, role: user.role, teamId: userTeamId },
      team: null
    });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// --- ЛИДЫ ---
app.get('/leads', auth.authMiddleware, leads.getLeads);
app.post('/leads', auth.authMiddleware, leads.createLead);
app.post('/leads/import', auth.authMiddleware, leads.importLeads); 
app.post('/leads/:id/status', auth.authMiddleware, leads.updateStatus);
app.put('/leads/:id', auth.authMiddleware, leads.updateLead);
app.delete('/leads/:id', auth.authMiddleware, leads.deleteLead);
app.post('/leads/mass-delete', auth.authMiddleware, leads.massDeleteLeads);

// --- КОМАНДА ---
app.get('/team', auth.authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.json({ team: null, members: [], teams: [] });
    
    if (currentUser.role === 'admin') {
      const allLeads = await User.find({ role: 'team_lead' });
      const teams = allLeads.map(u => ({
        Id: u._id.toString(),
        Name: u.teamName || `Команда ${u.email.split('@')[0]}`,
        LeadEmail: u.email
      }));
      return res.json({ team: null, members: [], teams: teams });
    }

    const targetTeamId = currentUser.role === 'team_lead' ? currentUser._id.toString() : currentUser.teamId;
    if (!targetTeamId) return res.json({ team: null, members: [], teams: [] });

    const leadUser = await User.findById(targetTeamId);
    const members = await User.find({ $or: [{ _id: targetTeamId }, { teamId: targetTeamId }] });

    res.json({ 
      team: { Id: targetTeamId, Name: leadUser?.teamName || 'Моя команда' }, 
      members: members.map(u => ({ id: u._id, email: u.email, role: u.role })),
      teams: [] 
    });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка БД' });
  }
});

app.post('/team/upgrade-to-lead', auth.authMiddleware, async (req, res) => {
  try {
    const { teamName = '' } = req.body;
    const currentUser = await User.findById(req.user.id);

    if (currentUser.role !== 'user' && currentUser.role !== 'member') {
      return res.status(400).json({ message: 'Вы уже лидер команды или админ' });
    }
    if (currentUser.teamId) {
      return res.status(400).json({ message: 'Вы уже состоите в чужой команде' });
    }

    currentUser.role = 'team_lead';
    currentUser.teamName = teamName.trim() || `Команда ${currentUser.email.split('@')[0]}`;
    await currentUser.save();

 
    const Lead = mongoose.model('Lead');
    await Lead.updateMany(
        { ownerId: currentUser._id, teamId: null }, 
        { teamId: currentUser._id.toString() }
    );

    res.json({
      ok: true,
      user: { id: currentUser._id, email: currentUser.email, role: currentUser.role, teamId: currentUser._id }
    });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка БД' });
  }
});

app.post('/team/members', auth.authMiddleware, async (req, res) => {
  try {

    const currentUser = await User.findById(req.user.id);

    if (currentUser.role !== 'team_lead' && currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Только тимлид может добавлять участников' });
    }

    const { email, password, role = 'member' } = req.body;
    const normEmail = String(email || '').trim().toLowerCase();
    
    const exists = await User.findOne({ email: normEmail });
    if (exists) return res.status(409).json({ message: 'Email уже зарегистрирован' });

    const newUser = new User({
      email: normEmail,
      passwordHash: String(password),
      role: role,

      teamId: currentUser.role === 'admin' ? req.body.teamId : currentUser._id 
    });
    await newUser.save();

    res.json({ 
      ok: true, 
      member: { id: newUser._id.toString(), email: newUser.email, role: newUser.role } 
    });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка добавления участника: ' + e.message });
  }
});
app.post('/admin/team-leads', auth.authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Только админ может создавать тимлидов' });
    }

    const { email, password, teamName } = req.body;
    const normEmail = String(email || '').trim().toLowerCase();
    
    const exists = await User.findOne({ email: normEmail });
    if (exists) return res.status(409).json({ message: 'Email уже зарегистрирован' });

    const newUser = new User({
      email: normEmail,
      passwordHash: String(password),
      role: 'team_lead',
      teamName: teamName || `Команда ${normEmail.split('@')[0]}`
    });
    await newUser.save();

    res.json({ 
      ok: true, 
      teamLead: { id: newUser._id.toString(), email: newUser.email, role: newUser.role } 
    });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка добавления тимлида: ' + e.message });
  }
});
//analitika
app.get('/analytics', auth.authMiddleware, async (req, res) => {
  try {
    const Lead = mongoose.model('Lead'); 
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    const targetTeamId = currentUser.role === 'team_lead' ? currentUser._id.toString() : currentUser.teamId;
    
    let teamMembers = 0;
    let leadQuery = {};

   if (currentUser.role === 'admin') {
      teamMembers = await User.countDocuments();
    } else if (targetTeamId) {
      teamMembers = await User.countDocuments({
        $or: [{ _id: targetTeamId }, { teamId: targetTeamId }]
      });
      leadQuery = { 
        $or: [
          { teamId: targetTeamId }, 
          { ownerId: req.user.id, teamId: null } 
        ] 
      };
    } else {
      teamMembers = 1; 
      leadQuery = { ownerId: req.user.id };
    }

    const totalLeads = await Lead.countDocuments(leadQuery);

    const statusAggr = await Lead.aggregate([
      { $match: leadQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const byStatus = {};
    statusAggr.forEach(item => { byStatus[item._id || 'New'] = item.count; });

    const sourceAggr = await Lead.aggregate([
      { $match: leadQuery },
      { $group: { _id: "$source", count: { $sum: 1 } } }
    ]);
    const bySource = {};
    sourceAggr.forEach(item => { bySource[item._id || 'Не указано'] = item.count; });

    // --- НОВАЯ ЛОГИКА ДЛЯ ТИМЛИДА И АДМИНА ---
    let managerPerformance = [];
    if (currentUser.role === 'admin' || currentUser.role === 'team_lead') {
      const managerStats = await Lead.aggregate([
        { $match: leadQuery },
        { 
          $group: { 
            _id: "$ownerId", 
            won: { $sum: { $cond: [{ $eq: ["$status", "Won"] }, 1, 0] } },
            lost: { $sum: { $cond: [{ $eq: ["$status", "Lost"] }, 1, 0] } },
            total: { $sum: 1 }
          } 
        }
      ]);
      
      const validOwnerIds = managerStats.map(s => s._id).filter(id => id != null);
      const managers = await User.find({ _id: { $in: validOwnerIds } }, 'email');

      managerPerformance = managerStats.map(stat => {
        const manager = managers.find(m => m._id.toString() === stat._id?.toString());
        return {
          _id: stat._id,
          won: stat.won,
          lost: stat.lost,
          total: stat.total,
          email: manager ? manager.email : 'Неизвестный менеджер'
        };
      });
    }


    res.json({
      totalLeads,
      byStatus,
      bySource,
      teamMembers,
      statusList: leads.STATUS_LIST || ['New', 'In Progress', 'Closed'],
      managerPerformance 
    });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка аналитики: ' + e.message });
  }
});

connectDB();
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
