const mongoose = require('mongoose');

const Lead = mongoose.model('Lead', new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  source: String,
  status: { type: String, default: 'New' },
  ownerId: String,
  createdAt: { type: Date, default: Date.now }
}));

const getLeads = async (req, res) => {
  try {
    const data = await Lead.find({});
    
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
    const newLead = new Lead(req.body);
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

const updateLead = async (req, res) => { res.json({ ok: true }); };

const deleteLead = async (req, res) => {
    try {
        await Lead.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

module.exports = { getLeads, createLead, updateStatus, updateLead, deleteLead };
