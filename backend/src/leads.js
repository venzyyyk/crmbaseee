const mongoose = require('mongoose');
const User = require('./User');
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
  createdAt: { type: Date, default: Date.now },

  history: [{
    status: String,
    comment: String,
    author: String,
    date: { type: Date, default: Date.now }
  }]
});

const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);

// ЖЕЛЕЗОБЕТОННОЕ ПОЛУЧЕНИЕ ЛИДОВ
const getLeads = async (req, res) => {
  try {
    const User = mongoose.model('User');
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.json([]);

    let query = {};
    
    if (currentUser.role !== 'admin') {
       // Надежно достаем ID команды (переводим в String)
       let targetTeamId = null;
       if (currentUser.role === 'team_lead') {
           targetTeamId = currentUser._id.toString();
       } else if (currentUser.teamId) {
           targetTeamId = currentUser.teamId.toString();
       }

       if (targetTeamId) {
           query = {
               $or: [
                   { teamId: targetTeamId }, // Лиды команды (и Тимлид, и Мембер ищут по этому ID)
                   { ownerId: req.user.id, teamId: null } // Старые/личные лиды
               ]
           };
       } else {
           // Если человек реально ни в какой команде
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

// ЖЕЛЕЗОБЕТОННОЕ СОЗДАНИЕ ЛИДОВ
const createLead = async (req, res) => {
  try {
    const User = mongoose.model('User');
    const currentUser = await User.findById(req.user.id);

    // Надежно достаем ID команды
    let targetTeamId = null;
    if (currentUser.role === 'team_lead') {
        targetTeamId = currentUser._id.toString();
    } else if (currentUser.teamId) {
        targetTeamId = currentUser.teamId.toString();
    }

    const newLead = new Lead({
        ...req.body,
        ownerId: req.user.id,
        teamId: targetTeamId // Сохраняем правильную строку
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
    const { status, comment } = req.body; 
    const User = mongoose.model('User');
    const currentUser = await User.findById(req.user.id);
    const historyEntry = {
      status: status,
      comment: comment || 'Без коментаря',
      author: currentUser ? currentUser.email : 'Невідомий',
      date: new Date()
    };
    await Lead.findByIdAndUpdate(id, { 
      status: status,
      $push: { history: historyEntry }
    });
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


const importLeads = async (req, res) => {
  try {
    const { leadsArray, targetTeamId: adminTargetId } = req.body; 
    const currentUser = await User.findById(req.user.id);
    

    let targetTeamId = null;
    if (currentUser.role === 'admin') {
        targetTeamId = adminTargetId;
    } else {
        targetTeamId = currentUser.role === 'team_lead' ? currentUser._id.toString() : currentUser.teamId;
    }

    if (!targetTeamId) return res.status(400).json({ message: 'Не выбрана команда для импорта' });

    const leadsToInsert = leadsArray.map(lead => ({
        name: lead.name || 'Без имени',
        phone: lead.phone || '',
        email: lead.email || '',
        socials: lead.socials || '',
        source: lead.source || 'Импорт БД',
        status: lead.status || 'New',
        clientRequest: lead.clientRequest || '',
        ownerId: req.user.id,
        teamId: targetTeamId,
        createdAt: new Date()
    }));

    await Lead.insertMany(leadsToInsert);
    res.json({ ok: true, importedCount: leadsToInsert.length });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const massDeleteLeads = async (req, res) => {
    try {
        const { ids } = req.body; 
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Ничего не выбрано' });
        }

        const currentUser = await User.findById(req.user.id);
        let query = { _id: { $in: ids } };


        if (currentUser.role !== 'admin') {
            const targetTeamId = currentUser.role === 'team_lead' ? currentUser._id.toString() : currentUser.teamId;
            query.teamId = targetTeamId;
        }

        const result = await Lead.deleteMany(query);
        res.json({ ok: true, deletedCount: result.deletedCount });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при массовом удалении' });
    }
};


module.exports = {
    getLeads,
    createLead,
    updateStatus,
    updateLead,
    deleteLead,
    importLeads,
    massDeleteLeads 
};
