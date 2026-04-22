const express = require('express');
const cors = require('cors');
const multer = require('multer');
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

app.post('/auth/register', auth.register());
app.post('/auth/login', auth.login());

app.get('/me', auth.authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      user: { id: user._id, email: user.email, role: user.role, teamId: user.teamId || null },
      team: null
    });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});


app.get('/leads', auth.authMiddleware, leads.getLeads);
app.post('/leads', auth.authMiddleware, leads.createLead);
app.post('/leads/:id/status', auth.authMiddleware, leads.updateStatus);
app.put('/leads/:id', auth.authMiddleware, leads.updateLead);
app.delete('/leads/:id', auth.authMiddleware, leads.deleteLead);


app.get('/team', auth.authMiddleware, async (req, res) => res.json({ team: null, members: [] }));
app.get('/analytics', auth.authMiddleware, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Lead = mongoose.model('Lead'); 
    const User = mongoose.model('User'); 


    const totalLeads = await Lead.countDocuments();

    const statusAggr = await Lead.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const byStatus = {};
    statusAggr.forEach(item => { byStatus[item._id || 'New'] = item.count; });

   
    const sourceAggr = await Lead.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } }
    ]);
    const bySource = {};
    sourceAggr.forEach(item => { bySource[item._id || 'Не указано'] = item.count; });

  
    let teamMembers = 0;
if (req.user.role === 'admin') {
  teamMembers = await User.countDocuments(); 
} else if (req.user.role === 'team_lead') {
  teamMembers = await User.countDocuments({ teamId: req.user.id }); 
}

    res.json({
      totalLeads,
      byStatus,
      bySource,
      teamMembers,
      statusList: leads.STATUS_LIST
    });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка аналитики' });
  }
});

connectDB();
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
