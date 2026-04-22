const mongoose = require('mongoose');
const User = require('./User'); 

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB подключена!');

    
    const adminEmail = 'admin@crm.local';
    const adminExists = await User.findOne({ email: adminEmail });
    
    if (!adminExists) {
      const newAdmin = new User({
        email: adminEmail,
        passwordHash: 'admin123', 
        role: 'admin'
      });
      await newAdmin.save();
      console.log('Дефолтный админ создан');
    }
  } catch (err) {
    console.error('Ошибка базы:', err);
  }
};

module.exports = connectDB;
