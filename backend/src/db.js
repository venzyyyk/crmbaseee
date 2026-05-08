const mongoose = require('mongoose');
const User = require('./User'); 

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connect!');

    
    const adminEmail = 'admin@crm.local';
    const adminExists = await User.findOne({ email: adminEmail });
    
    if (!adminExists) {
      const newAdmin = new User({
        email: adminEmail,
        passwordHash: 'admin', 
        role: 'admin'
      });
      await newAdmin.save();
      console.log('defoltadmin');
    }
  } catch (err) {
    console.error('error base:', err);
  }
};

module.exports = connectDB;
