const mongoose = require('mongoose');

const STATUS_LIST = ['New', 'In Progress', 'Closed', 'Успішно', 'Втрачено'];

const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  socials: { type: String, default: '' },
  source: { type: String, default: 'Не указано' },
  status: { type: String, default: 'New' },
  clientRequest: { type: String, default: '' },
  deadline: { type: Date, default: null },
  ownerId: { type: String, default: null },
  teamId: { type: String, default: null },
  assignedToUserId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);


const getLeads = async (req, res) => {
  try {
    const User = mongoose.model('User');
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.json([]);

    let query = {};
    

    if (currentUser.role !== 'admin') {
       const targetTeamId = currentUser.role === 'team_lead' ? currentUser._id.toString() : currentUser.teamId;
       
       if (targetTeamId) {
        
           query = { teamId: targetTeamId };
       } else {

           query = { ownerId: req.user.id };
       }
    }

    const data = await Lead.find(query);
    const mapped = data.map(lead => {
      const obj = lead.toObject();
      obj.id = obj._id.toString(); 
      return obj;
    });
    res.json(mapped);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const createLead = async (req, res) => {
  try {
    const User = mongoose.model('User');
    const currentUser = await User.findById(req.user.id);
    const targetTeamId = currentUser.role === 'team_lead' ? currentUser._id.toString() : currentUser.teamId;

    const newLead = new Lead({
        ...req.body,
        ownerId: req.user.id,
        teamId: targetTeamId
    });
    await newLead.save();
    
    const obj = newLead.toObject();
    obj.id = obj._id.toString(); 
    res.json(obj);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await Lead.findByIdAndUpdate(id, { status });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    await Lead.findByIdAndUpdate(id, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const deleteLead = async (req, res) => {
    try {
        await Lead.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

module.exports = { getLeads, createLead, updateStatus, updateLead, deleteLead, STATUS_LIST };
