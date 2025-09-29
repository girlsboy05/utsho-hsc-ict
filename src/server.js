require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const layouts = require('express-ejs-layouts');
const { setOtp, verifyOtp } = require('./utils/otp');
const { nextRoll, loadUsers, saveUsers } = require('./utils/roll');
const { sendOtp, sendConfirmation } = require('./services/smsGateway');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(layouts);
app.set('layout', 'layout');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// default locals
app.use((req,res,next)=>{ res.locals.active = null; res.locals.scripts = ''; next(); });

app.use(session({
  secret: process.env.SESSION_SECRET || 'change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000*60*60*12 }
}));

const routine = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'routine.2025.json'), 'utf8'));

// Helpers
function findUser(mobile, dob){
  const users = loadUsers();
  return users.find(u => u.mobile === mobile && u.dob === dob);
}
function findUserByMobile(mobile){
  return loadUsers().find(u => u.mobile === mobile);
}
function requireAuth(req,res,next){
  if (req.session && req.session.user){ return next(); }
  return res.redirect('/');
}

// Routes
app.get('/', (req,res)=>{
  res.render('login', { error:null, fontUrl: 'https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@400;600;700&display=swap' });
});

app.post('/login', (req,res)=>{
  const { mobile, dob } = req.body;
  const user = findUser(mobile, dob);
  if (!user){
    return res.render('login', { error: 'Invalid mobile or date of birth.', fontUrl: 'https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@400;600;700&display=swap' });
  }
  req.session.user = { name: user.fullName, mobile: user.mobile, roll: user.roll };
  res.redirect('/dashboard');
});

app.get('/register', (req,res)=>{
  res.render('register', { stage:'start', data:{}, error:null, schoolsPath:'/public/schools.json', fontUrl: 'https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@400;600;700&display=swap' });
});

app.post('/register/check', (req,res)=>{
  const { mobile, dob } = req.body;
  const exists = findUser(mobile, dob);
  if (exists){
    return res.render('register', { stage:'blocked', data:{ name: exists.fullName }, error:null, schoolsPath:'/public/schools.json', fontUrl: 'https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@400;600;700&display=swap' });
  }
  return res.render('register', { stage:'form', data:{ mobile, dob }, error:null, schoolsPath:'/public/schools.json', fontUrl: 'https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@400;600;700&display=swap' });
});

app.post('/register/submit', async (req,res)=>{
  const { mobile, dob, fullName, gender, school, batch, group } = req.body;
  // store temp registration in session
  req.session.pendingReg = { mobile, dob, fullName, gender, school, batch, group };
  const { code, expiresAt } = setOtp(mobile, 5);
  await sendOtp({ to: mobile, code, ttlSeconds: 300 });
  res.render('otp', { mobile, expiresAt, error:null, fontUrl: 'https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@400;600;700&display=swap' });
});

app.post('/register/verify', async (req,res)=>{
  const { mobile, code } = req.body;
  const result = verifyOtp(mobile, code);
  if (!result.ok){
    return res.render('otp', { mobile, expiresAt:null, error:'Invalid or expired code.', fontUrl: 'https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@400;600;700&display=swap' });
  }
  const users = loadUsers();
  const pending = req.session.pendingReg;
  if (!pending){
    return res.redirect('/register');
  }
  const roll = nextRoll();
  const user = {
    mobile: pending.mobile,
    dob: pending.dob,
    fullName: pending.fullName,
    gender: pending.gender,
    school: pending.school,
    batch: pending.batch,
    group: pending.group,
    roll,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);
  await sendConfirmation({ to: pending.mobile, name: pending.fullName, roll });
  delete req.session.pendingReg;
  req.session.user = { name: user.fullName, mobile: user.mobile, roll: user.roll };
  res.redirect('/dashboard');
});

app.get('/logout', (req,res)=>{
  req.session.destroy(()=> res.redirect('/'));
});

// Dashboard
app.get('/dashboard', requireAuth, (req,res)=>{
  res.locals.active = 'classes';
  res.render('dashboard', {
    user: req.session.user,
    routineJson: JSON.stringify(routine),
    fontUrl: 'https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@400;600;700&display=swap',
    scripts: `<script>const ROUTINE=${JSON.stringify(routine)};</script><script src=\"/public/js/dashboard.js\"></script>`
  });
});

// Provide schools JSON and logo
app.get('/public/schools.json', (req,res)=>{
  res.json({
    schools: [
      "Adamjee Cantonment College",
      "Aeronautical Institute of Bangladesh",
      "Atomic Energy Research Establishment School & College",
      "BAF Shaheen College Dhaka",
      "BAF Shaheen College Kurmitola",
      "Banani Bidyaniketan School & College",
      "Banophool Adibashi Green Heart College",
      "BCIC College",
      "Begum Badrunnesa Govt. Girls’ College",
      "Birshrestha Noor Mohammad Public College",
      "Cambrian School & College",
      "College of Aviation & Technology",
      "Dhaka City College",
      "Dhaka College",
      "Dhaka Commerce College",
      "Dhaka Imperial College",
      "Dhaka Residential Model College",
      "Government Bangla College",
      "Government Mohammadpur Model School & College",
      "Government Physical Education College, Dhaka",
      "Government Science College, Dhaka",
      "Government Shaheed Suhrawardy College",
      "Habibullah Bahar College",
      "Holy Cross College",
      "Ideal College",
      "Ideal School & College",
      "Milestone College",
      "Mirpur College",
      "Mohammadpur Preparatory School & College",
      "National Ideal College",
      "Notre Dame College",
      "Noubahini College, Dhaka",
      "RAJUK Uttara Model College",
      "St. Joseph Higher Secondary School",
      "Shaheed Bir Uttam Lt. Anwar Girls’ College",
      "Shaheed Ramiz Uddin Cantonment College",
      "Shamsul Hoque Khan School & College",
      "SOS Hermann Gmeiner College",
      "University Laboratory School & College",
      "Uttara Government College",
      "Tejgaon College",
      "Government Titumir College",
      "Eden Mohila College",
      "Siddheswari College",
      "Siddheswari Girls’ College",
      "Lalmatia Mohila College",
      "Mohammadpur Government College",
      "Shaheed Anwar Girls’ College",
      "Bir Shreshtha Munshi Abdur Rouf BGB College",
      "BAF Shaheen College (Tejgaon campus)",
      "Willes Little Flower College",
      "Dhaka Mohanagar Mohila College",
      "Khilgaon Model College",
      "Dhanmondi Ideal College",
      "Motijheel Ideal College",

      "Government Tolaram College",
      "Narayanganj Government Mohila College",
      "Narayanganj College",
      "Govt. Adamjee Nagar Mohila/M.W. College",
      "Haji Misir Ali University College",
      "Safar Ali College",
      "Narayanganj Girls’ School & College",
      "Gopaldi Nazrul Islam Babu College",
      "Baliapara High School & College"
    ]
  });
});

app.listen(PORT, ()=>{
  console.log('UTSLMS listening on http://localhost:'+PORT);
});
