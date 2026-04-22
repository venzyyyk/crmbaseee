const jwt = require('jsonwebtoken');
const User = require('./User'); 

const SECRET = process.env.JWT_SECRET || 'tvoisecretkey';
const register = () => async (req, res) => {
  try {
    const { email, password, role, teamName } = req.body; 
    const normEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normEmail });
    if (existing) return res.status(409).json({ message: 'Email уже занят' });

    const newUser = new User({
      email: normEmail,
      passwordHash: String(password),
      role: role === 'team_lead' ? 'team_lead' : 'user',

      teamName: role === 'team_lead' ? (teamName || 'Моя команда') : '' 
    });
    await newUser.save();
    
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: newUser._id, email: newUser.email, role: newUser.role } });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка регистрации: ' + e.message });
  }
};

const login = () => async (req, res) => {
  try {
    const { email, password } = req.body;
    const normEmail = email.toLowerCase().trim();
    
    const user = await User.findOne({ email: normEmail });

    // Сверяем пароль с полем passwordHash
    if (!user || user.passwordHash !== String(password)) {
      return res.status(401).json({ message: 'Неверные данные' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка логина: ' + e.message });
  }
};

const authMiddleware = (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Нет токена' });
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ message: 'Не авторизован' });
  }
};

module.exports = { register, login, authMiddleware };
