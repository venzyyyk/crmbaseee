const express = require('express');
const cors = require('cors');
const multer = require('multer');
const connectDB = require('./db');
const auth = require('./auth');
const leads = require('./leads');
const User = require('./User');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

function mapUser(u) {
  if (!u) return null;
  return {
    id: u._id,
    email: u.email,
    role: u.role,
    teamId: u.teamId || null
  };
}

app.post('/auth/register', auth.register);
app.post('/auth/login', auth.login);

app.get('/me', auth.authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: mapUser(user), team: null });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.get('/leads', auth.authMiddleware, leads.getLeads);
app.post('/leads', auth.authMiddleware, leads.createLead);
app.post('/leads/:id/status', auth.authMiddleware, leads.updateStatus);
app.put('/leads/:id', auth.authMiddleware, leads.updateLead);
app.delete('/leads/:id', auth.authMiddleware, leads.deleteLead);

app.get('/analytics', auth.authMiddleware, async (req, res) => {
  try {
    res.json({
      totalLeads: 0,
      byStatus: {},
      bySource: {},
      teamMembers: 0,
      statusList: ['New', 'In Progress', 'Closed']
    });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка аналитики' });
  }
});

app.get('/team', auth.authMiddleware, async (req, res) => {
  res.json({ team: null, members: [] });
});

connectDB(); 

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
