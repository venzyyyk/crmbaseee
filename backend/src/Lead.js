const mongoose = require('mongoose');
const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  source: { type: String, default: 'Не указано' },
  status: { type: String, default: 'New' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Lead', LeadSchema);
