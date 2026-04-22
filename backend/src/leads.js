const mongoose = require('mongoose');
const Lead = mongoose.model('Lead', new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  source: String,
  status: { type: String, default: 'New' },
  ownerId: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now }
}));

const getLeads = async (req, res) => {
  try {
    const data = await Lead.find({});
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const createLead = async (req, res) => {
  try {
    const newLead = new Lead(req.body);
    await newLead.save();
    res.json(newLead);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const updateStatus = async (req, res) => { res.json({ ok: true }); };
const updateLead = async (req, res) => { res.json({ ok: true }); };
const deleteLead = async (req, res) => { res.json({ ok: true }); };

module.exports = { getLeads, createLead, updateStatus, updateLead, deleteLead };
