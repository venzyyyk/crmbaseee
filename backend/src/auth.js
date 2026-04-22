const jwt = require('jsonwebtoken');
const User = require('./User'); 

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';


function issueToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, teamId: user.teamId || null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}


function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'No token' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}


function register() {
  return async (req, res) => {
    const { email, password, role = 'user' } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();

    if (!normEmail || !password) return res.status(400).json({ message: 'Введите email и пароль' });

    try {
      
      const exists = await User.findOne({ email: normEmail });
      if (exists) return res.status(409).json({ message: 'Email уже зарегистрирован' });

     
      const newUser = new User({
        email: normEmail,
        password: password, 
        role: role === 'team_lead' ? 'team_lead' : 'user'
      });

      await newUser.save();

      return res.json({ 
        token: issueToken(newUser), 
        user: { id: newUser._id, email: newUser.email, role: newUser.role } 
      });
    } catch (err) {
      return res.status(500).json({ message: 'Ошибка базы: ' + err.message });
    }
  };
}


function login() {
  return async (req, res) => {
    const { email, password } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();

    if (!normEmail || !password) return res.status(400).json({ message: 'Введите email и пароль' });

    try {
     
      const user = await User.findOne({ email: normEmail });
      
      if (!user || user.password !== String(password)) {
        return res.status(401).json({ message: 'Неверные данные' });
      }

      return res.json({ 
        token: issueToken(user), 
        user: { id: user._id, email: user.email, role: user.role, teamId: user.teamId || null } 
      });
    } catch (err) {
      return res.status(500).json({ message: 'Ошибка входа: ' + err.message });
    }
  };
}

module.exports = { register, login, authMiddleware, issueToken };
