const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const cron = require('node-cron');
const moment = require('moment-timezone');

const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false },
}));

// Socket.IO setup
const io = new Server(server, {
  cors: corsOptions,
});

// Load environment variables
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://rgnaceno:rgnacenoMONGODB@tracking.lm4guf1.mongodb.net/?retryWrites=true&w=majority&appName=tracking', {
  serverApi: { version: '1', strict: true, deprecationErrors: true }
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  approved: { type: Boolean, default: false },
  email: { type: String, required: true },
  department: String,
  role: String
}));

// Document Schema
const documentSchema = new mongoose.Schema({
  documentId: { type: String, unique: true, required: true }, // Add documentId field
  title: { type: String, required: true, trim: true },
  status: { type: String, required: true, enum: ['Pending', 'In-Review', 'Completed', 'Archived'], default: 'Pending' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByUsername: { type: String, required: true, default: 'Unknown User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  department: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  urgent: { type: Boolean, default: false },
  documentType: { type: String, required: true, trim: true },
  purpose: { type: String, required: true, trim: true },
  releaseTo: { type: String, required: true, trim: true },
  viewed: { type: Boolean, default: false },
  viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  accepted: { type: Boolean, default: false },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  acceptedByUsername: { type: String, default: null },
  routedByUsername: { type: String, default: null },
  history: [{
    action: { type: String, required: true },
    department: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    routedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    routedByUsername: { type: String, default: null }
  }],
  fileUrl: { type: String, default: '' },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

const Document = mongoose.model('Document', documentSchema);

// Helper function to get the last reset time (8 AM PHT)
const getLastResetTime = () => {
  const now = moment.tz('Asia/Manila');
  const resetTimeToday = moment.tz('Asia/Manila').set({ hour: 8, minute: 0, second: 0, millisecond: 0 });
  return now.isBefore(resetTimeToday) 
    ? resetTimeToday.clone().subtract(1, 'day') 
    : resetTimeToday;
};

// Authentication middleware
const authenticate = (req, res, next) => {
  if (req.session.userId) {
    req.user = { _id: req.session.userId };
    next();
  } else {
    res.status(401).send('Not authenticated');
  }
};

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected on port 5001');
  socket.on('trackDocument', async (query) => {
    try {
      const conditions = [];
      if (mongoose.Types.ObjectId.isValid(query)) {
        conditions.push({ _id: query });
      }
      conditions.push({ documentId: query });
      conditions.push({ title: { $regex: `^${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
      const docs = await Document.find({ $or: conditions });
      if (docs.length > 0) {
        docs.forEach(doc => {
          socket.join(doc._id.toString());
          io.to(doc._id.toString()).emit('documentUpdate', { id: doc._id, documentId: doc.documentId, status: doc.status });
        });
      }
    } catch (err) {
      console.error('Error tracking documents:', err);
    }
  });
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// User routes
app.post('/api/register', (req, res) => {
  const { username, password, email, department, role } = req.body;
  if (!username || !password || !email) return res.status(400).send('Username, password, and email are required');
  const user = new User({ username, password, approved: false, email, department, role });
  user.save().then(() => res.send('Registration pending admin approval'))
    .catch(err => res.status(500).send('Error saving user: ' + err.message));
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Username and password are required');
  User.findOne({ username, password, approved: true }).then(user => {
    if (user) {
      req.session.userId = user._id;
      res.json({ success: true, userId: user._id, username: user.username, department: user.department });
    } else {
      res.status(401).send('Invalid credentials or account not approved');
    }
  }).catch(err => res.status(500).send('Error finding user: ' + err.message));
});

app.get('/api/user/check', authenticate, (req, res) => {
  User.findById(req.user._id).then(user => {
    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        department: user.department,
        role: user.role,
      });
    } else {
      res.status(404).send('User not found');
    }
  }).catch(err => {
    console.error('Error in /api/user/check:', err);
    res.status(500).send('Error fetching user: ' + err.message);
  });
});

app.put('/api/user/:id/username', (req, res) => {
  const { username } = req.body;
  const userId = req.params.id;
  if (!username) return res.status(400).send('Username is required');
  if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
  User.findByIdAndUpdate(userId, { username }, { new: true })
    .then(user => {
      if (!user) return res.status(404).send('User not found');
      res.json({ username: user.username });
    })
    .catch(err => {
      console.error('Error updating username:', err.message);
      res.status(500).send('Error updating username: ' + err.message);
    });
});

app.put('/api/user/:id/email', (req, res) => {
 

  const { email } = req.body;
  const userId = req.params.id;
  if (!email) return res.status(400).send('Email is required');
  if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
  User.findByIdAndUpdate(userId, { email }, { new: true })
    .then(user => {
      if (!user) return res.status(404).send('User not found');
      res.json({ email: user.email });
    })
    .catch(err => res.status(500).send('Error updating email: ' + err.message));
});

app.put('/api/user/:id/password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.params.id;
  if (!currentPassword || !newPassword) return res.status(400).send('Current and new passwords are required');
  if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
  User.findById(userId)
    .then(user => {
      if (!user) return res.status(404).send('User not found');
      if (user.password !== currentPassword) return res.status(401).send('Current password is incorrect');
      user.password = newPassword;
      user.save()
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).send('Error updating password: ' + err.message));
    })
    .catch(err => res.status(500).send('Error finding user: ' + err.message));
});
// In server.js, before the document routes
const officeCodeMap = {
  'Office of the SDS': '001',
  'Office of the ASDS': '002',
  'Administrative Section': '003',
  'Personnel Section': '004',
  'Cash Section': '005',
  'Accounting Section': '006',
  'Budget Section': '008',
  'CID': '009',
  'SGOD': '010',
  'Supply Section': '011',
  'Records Section': '012',
  'Learning Resource Management Section': '013',
  'ICT Section': '014',
  'Legal Section': '015',
  'Amarosa ES': '016',
  'Balacad ES': '017',
  'Buttong ES': '018',
  'Cabeza ES': '019',
  'Calayab ES': '020',
  'Cavit-Araniw ES': '021',
  'Darayday ES': '022',
  'Gabu ES': '023',
  'Laoag CES': '024',
  'Tangid ES': '025',
  'Agripino P. Santos ES': '026',
  'Alipio N. Ignacio MES': '027',
  'Caaoacan ES': '028',
  'Casili ES': '029',
  'Cataban ES': '030',
  'Den Galicano R. Rafales MES': '031',
  'Eulalio F. Siazon MES': '032',
  'Navotas ES': '033',
  'Pila ES': '034',
  'Shamrock ES': '035',
  'Sta. Maria ES': '036',
  'Suyo ES': '037',
  'Bacsil ES': '038',
  'Barit ES': '039',
  'Vira ES': '040',
  'Faustino Reyes MES': '041',
  'Gabaldon ES': '042',
  'Lagui-Sail ES': '043',
  'Plaridel ES': '044',
  'Roque B. Ablan MES': '045',
  'Ilocos Norte College of Arts & Trades': '049',
  'Ilocos Norte National High School': '050',
  'Ilocos Norte Regional School of Fisheries': '051',
  'Caaoacan HS': '052',
  'Balatong IS': '053',
  'San Mateo IS': '054',
  'Mariano Marcos State University - Laoag City': '055',
  'Atty. Sixto S. Pedro Memorial Christian Academy': '056',
  'Caterpillar Centre for Early Learners, Inc.': '057',
  'Kids\' Kollege, Inc.': '058',
  'Maranatha Christian School of Laoag, Inc.': '059',
  'Saved by Grace Christian Academy, Inc.': '060',
  'St. Santiago School Foundation, Inc.': '061',
  'The Living Gates of Praise Christian School, Inc.': '062',
  'Ilocos Norte Adventist School Inc.': '063',
  'Bible Believing Baptist Church Educational Ministries Foundation, Inc.': '064',
  'Northside Bible Baptist Academy, Inc.': '065',
  'Padre Annibale Integrated School, Inc.': '066',
  'Holy Spirit Academy of Laoag': '067',
  'International School of the Arts, the Languages, and the Academe': '068',
  'Our Saviour\'s Foundation, Inc.': '069',
  'Divine Word College Laoag': '070',
  'Northern Christian College Basic Education School': '071',
  'Northwestern University': '072',
  'Emmanuel Fundamental Baptist Learning Center': '073',
  'Laoag Four Square Kindergarten Sch. Inc.': '074',
  'MRS Dayspring Christian School': '075',
  'The Salvation Army Educational Services, Inc.': '076',
  'St. Joseph High School of Laoag, Inc.': '077',
  'St. Mary\'s Seminary': '078',
  'AIE College - Laoag, Inc.': '079',
  'AMA Computer College-Laoag City Inc.': '080',
  'Data Center College of the Philippines of Laoag City': '081',
  'STI College - Laoag': '082',
  'Medical Unit': '083',
  'Dental Unit': '084',
  'BAC Office': '086',
  'Payroll': '088',
  'DWAT Radio Station': '089',
  'Disaster Risk Reduction and Management Unit': '095',
  'Sample Office': '096'
};

// Helper function to extract office name from releaseTo (removing prefixes like 'Unit:', 'School:', etc.)
const getOfficeName = (releaseTo) => {
  if (releaseTo.startsWith('Unit: ')) return releaseTo.replace('Unit: ', '');
  if (releaseTo.startsWith('School: ')) return releaseTo.replace('School: ', '');
  if (releaseTo.startsWith('Private School: ')) return releaseTo.replace('Private School: ', '');
  if (releaseTo.startsWith('Agency: ')) return releaseTo.replace('Agency: ', '');
  return releaseTo;
};
// Document routes
app.post('/api/documents', async (req, res) => {
  console.log('Creating document at:', new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  try {
    const { userId, title, description, documentType, purpose, releaseTo, urgent } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');

    // Generate documentId
    const now = moment.tz('Asia/Manila');
    const month = now.format('MM');
    const year = now.format('YY');
    const officeName = getOfficeName(releaseTo);
    const officeCode = officeCodeMap[officeName];
    if (!officeCode) return res.status(400).send(`Invalid office: ${releaseTo}`);

    // Count documents for this office in the current month and year
    const docCount = await Document.countDocuments({
      documentId: { $regex: `^${month}${year}-${officeCode}-` },
      createdAt: {
        $gte: moment.tz('Asia/Manila').startOf('month').toDate(),
        $lte: moment.tz('Asia/Manila').endOf('month').toDate()
      }
    });

    // Generate sequential number (increment by 1)
    const sequentialNumber = String(docCount + 1).padStart(4, '0');
    const documentId = `${month}${year}-${officeCode}-${sequentialNumber}`;

    const document = new Document({
      documentId,
      userId,
      createdByUsername: user.username,
      title,
      description,
      documentType,
      purpose,
      releaseTo,
      department: user.department,
      urgent: !!urgent,
      createdAt: new Date(),
      history: [{ action: 'Created', department: user.department, date: new Date(), routedBy: userId, routedByUsername: user.username }],
    });

    await document.save();
    io.to(document._id.toString()).emit('documentUpdate', { id: document._id, documentId: document.documentId, action: 'created' });
    res.status(201).json(document);
  } catch (err) {
    res.status(500).send('Error creating document: ' + err.message);
  }
});

app.patch('/api/documents/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, documentType, purpose, releaseTo, urgent } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send('Invalid Document ID');
    const document = await Document.findById(id);
    if (!document) return res.status(404).send('Document not found');
    if (document.userId.toString() !== req.user._id) {
      return res.status(403).send('Not authorized to edit this document');
    }
    if (document.deleted || document.status === 'Archived' || document.status === 'Completed') {
      return res.status(403).send('Cannot edit deleted, archived, or completed document');
    }
    const user = await User.findById(req.user._id);
    document.title = title || document.title;
    document.description = description || document.description;
    document.documentType = documentType || document.documentType;
    document.purpose = purpose || document.purpose;
    document.releaseTo = releaseTo || document.releaseTo;
    document.urgent = urgent !== undefined ? urgent : document.urgent;
    document.updatedAt = new Date();
    document.history.push({ action: 'Edited', department: user.department, date: new Date(), routedBy: req.user._id, routedByUsername: user.username });
    await document.save();
    io.to(document._id.toString()).emit('documentUpdate', { id: document._id, action: 'edited' });
    res.json(document);
  } catch (err) {
    res.status(500).send('Error updating document: ' + err.message);
  }
});

app.get('/api/documents/:userId', authenticate, async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const documents = await Document.find({ 
      $or: [
        { userId, deleted: false },
        { acceptedBy: userId, deleted: false },
        { releaseTo: user.department, deleted: false }
      ]
    }).sort({ createdAt: -1 });
    // Enhanced debug log to verify history content
    documents.forEach(doc => {
      console.log(`Document ${doc._id}: createdByUsername=${doc.createdByUsername}, department=${doc.department}, history=${JSON.stringify(doc.history)}`);
    });
    res.json(documents);
  } catch (err) {
    res.status(500).send('Error fetching documents: ' + err.message);
  }
});
// In the Document schema definition
documentSchema.pre('save', function (next) {
  if (!this.createdAt) {
    this.createdAt = new Date();
  }
  next();
});
app.get('/api/document/:id', authenticate, async (req, res) => {
  try {
    const docId = req.params.id;
    const isMongoId = mongoose.Types.ObjectId.isValid(docId);
    const query = isMongoId ? { _id: docId } : { documentId: docId };
    const document = await Document.findOne(query);
    if (!document) return res.status(404).send('Document not found');
    const user = await User.findById(req.user._id);
    if (document.userId.toString() !== req.user._id && 
        (!document.acceptedBy || document.acceptedBy.toString() !== req.user._id) && 
        document.releaseTo !== user.department) {
      return res.status(403).send('Not authorized to view this document');
    }
    if (document.deleted && document.userId.toString() !== req.user._id && 
        (!document.acceptedBy || document.acceptedBy.toString() !== req.user._id)) {
      return res.status(403).send('Access denied: Document is deleted');
    }
    res.json(document);
  } catch (err) {
    console.error('Error fetching document:', err);
    res.status(500).send('Error fetching document: ' + err.message);
  }
});

app.get('/api/document', authenticate, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).send('Query parameter is required');
    
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).send('User not found');

    const conditions = [];
    if (mongoose.Types.ObjectId.isValid(query)) {
      conditions.push({ _id: query });
    }
    conditions.push({ documentId: query });
    conditions.push({ title: { $regex: `^${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });

    const docs = await Document.find({
      $and: [
        { $or: conditions },
        { deleted: false },
        {
          $or: [
            { userId: req.user._id },
            { acceptedBy: req.user._id, status: 'Completed' },
            { releaseTo: user.department }
          ]
        }
      ]
    });

    if (docs.length === 0) return res.status(404).send('No documents found');
    res.json(docs);
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).send('Error fetching documents: ' + err.message);
  }
});

app.put('/api/document/:id/view', async (req, res) => {
  const { userId } = req.body;
  const docId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(docId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).send('Invalid Document ID or User ID');
  }
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const doc = await Document.findByIdAndUpdate(
      docId,
      { 
        viewed: true,
        $addToSet: { viewedBy: userId },
        $push: { history: { action: 'Viewed', department: user.department, date: new Date(), routedBy: userId, routedByUsername: user.username } }
      },
      { new: true }
    );
    if (!doc) return res.status(404).send('Document not found');
    io.to(doc._id.toString()).emit('documentUpdate', { id: doc._id, action: 'viewed' });
    res.json(doc);
  } catch (err) {
    res.status(500).send('Error marking document as viewed: ' + err.message);
  }
});

app.put('/api/document/:id/accept', async (req, res) => {
  const { userId } = req.body;
  const docId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(docId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).send('Invalid Document ID or User ID');
  }
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const doc = await Document.findByIdAndUpdate(
      docId,
      { 
        accepted: true,
        acceptedBy: userId,
        acceptedByUsername: user.username,
        status: 'In-Review',
        $push: { history: { action: 'Accepted', department: user.department, date: new Date(), routedBy: userId, routedByUsername: user.username } }
      },
      { new: true }
    );
    if (!doc) return res.status(404).send('Document not found');
    io.to(doc._id.toString()).emit('documentUpdate', { id: doc._id, action: 'accepted' });
    res.json(doc);
  } catch (err) {
    res.status(500).send('Error accepting document: ' + err.message);
  }
});

app.put('/api/documents/:id/route', async (req, res) => {
  try {
    const docId = req.params.id;
    const { routeTo, userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(docId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send('Invalid Document ID or User ID');
    }
    if (!routeTo) {
      return res.status(400).send('Route destination is required');
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    const doc = await Document.findById(docId);
    if (!doc) {
      return res.status(404).send('Document not found');
    }
    if (!doc.accepted || doc.acceptedBy.toString() !== userId) {
      return res.status(403).send('Not authorized to route this document');
    }
    if (doc.status === 'Archived' || doc.status === 'Completed') {
      return res.status(403).send('Cannot route archived or completed document');
    }
    doc.releaseTo = routeTo;
    doc.accepted = false;
    doc.acceptedBy = null;
    doc.acceptedByUsername = null;
    doc.routedByUsername = user.username;
    doc.updatedAt = new Date();
    doc.history.push({
      action: 'Routed',
      department: routeTo,
      date: new Date(),
      routedBy: userId,
      routedByUsername: user.username
    });
    await doc.save();
    io.to(doc._id.toString()).emit('documentUpdate', { id: doc._id, action: 'routed', routeTo });
    res.json(doc);
  } catch (err) {
    console.error('Error routing document:', err);
    res.status(500).send('Error routing document: ' + err.message);
  }
});

app.put('/api/document/:id/release', async (req, res) => {
  const { userId, department } = req.body;
  const docId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(docId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).send('Invalid Document ID or User ID');
  }
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const doc = await Document.findByIdAndUpdate(
      docId,
      { 
        status: 'Completed',
        updatedAt: new Date(),
        $push: { history: { action: 'Released', department, date: new Date(), routedBy: userId, routedByUsername: user.username } }
      },
      { new: true }
    );
    if (!doc) return res.status(404).send('Document not found');
    io.to(doc._id.toString()).emit('documentUpdate', { id: doc._id, action: 'released' });
    res.json(doc);
  } catch (err) {
    res.status(500).send('Error releasing document: ' + err.message);
  }
});

app.get('/api/documents/:userId/incoming', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const today = getLastResetTime();
    const tomorrow = today.clone().add(1, 'day');
    const documents = await Document.find({
      releaseTo: user.department,
      accepted: false,
      deleted: false,
      createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() }
    }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).send('Error fetching incoming documents: ' + err.message);
  }
});

app.get('/api/documents/:userId/completed', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const documents = await Document.find({
      $or: [
        { userId, status: 'Completed', deleted: false },
        { acceptedBy: userId, status: 'Completed', deleted: false }
      ]
    }).sort({ updatedAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).send('Error fetching completed documents: ' + err.message);
  }
});

app.get('/api/documents/:userId/created-today', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const today = getLastResetTime();
    const tomorrow = today.clone().add(1, 'day');
    const documents = await Document.find({
      userId,
      deleted: false,
      createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() }
    }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).send('Error fetching created-today documents: ' + err.message);
  }
});

app.get('/api/user/:id', (req, res) => {
  User.findById(req.params.id)
    .then(user => {
      if (!user) return res.status(404).send('User not found');
      res.json({
        username: user.username,
        email: user.email,
        department: user.department,
        role: user.role,
        _id: user._id
      });
    })
    .catch(err => res.status(500).send('Error fetching user: ' + err.message));
});

app.get('/api/documents/:userId/trash', async (req, res) => {
  try {
    const documents = await Document.find({ 
      userId: req.params.userId, 
      deleted: true 
    }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/documents/:id/delete', async (req, res) => {
  try {
    const docId = req.params.id;
    const isMongoId = mongoose.Types.ObjectId.isValid(docId);
    const query = isMongoId ? { _id: docId } : { documentId: docId };
    const document = await Document.findOneAndUpdate(
      query,
      { deleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!document) return res.status(404).json({ message: 'Document not found' });
    const user = await User.findById(document.userId);
    document.history.push({
      action: 'Deleted',
      department: user ? user.department : 'Unknown',
      date: new Date(),
      routedBy: document.userId,
      routedByUsername: user ? user.username : 'Unknown User'
    });
    await document.save();
    io.to(document._id.toString()).emit('documentUpdate', { id: document._id, documentId: document.documentId, action: 'deleted' });
    res.json(document);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(docId)) return res.status(400).send('Invalid Document ID');
    const document = await Document.findByIdAndDelete(docId);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    io.to(docId.toString()).emit('documentUpdate', { id: docId, action: 'permanentlyDeleted' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error permanently deleting document: ' + err.message });
  }
});

app.put('/api/documents/:id/restore', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    const daysSinceDeletion = (new Date() - new Date(document.deletedAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceDeletion >= 30) {
      return res.status(400).json({ message: 'Cannot restore: Document has been in trash for over 30 days' });
    }
    const user = await User.findById(document.userId);
    document.deleted = false;
    document.deletedAt = null;
    document.history.push({
      action: 'Restored',
      department: user ? user.department : 'Unknown',
      date: new Date(),
      routedBy: document.userId,
      routedByUsername: user ? user.username : 'Unknown User'
    });
    await document.save();
    io.to(document._id.toString()).emit('documentUpdate', { id: document._id, action: 'restored' });
    res.json(document);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/documents/:userId/accepted', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const today = getLastResetTime();
    const tomorrow = today.clone().add(1, 'day');
    const documents = await Document.find({
      acceptedBy: userId,
      accepted: true,
      deleted: false,
      status: 'In-Review',
      createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() }
    }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).send('Error fetching accepted documents: ' + err.message);
  }
});

app.get('/api/documents/:userId/stats', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const today = getLastResetTime();
    const tomorrow = today.clone().add(1, 'day');

    const stats = {
      incoming: await Document.countDocuments({
        releaseTo: user.department,
        accepted: false,
        deleted: false,
        createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() }
      }),
      completedToday: await Document.countDocuments({
        status: 'Completed',
        deleted: false,
        updatedAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
        $or: [{ userId }, { acceptedBy: userId }]
      }),
      urgent: await Document.countDocuments({
        urgent: true,
        deleted: false,
        createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
        $or: [{ userId }, { acceptedBy: userId }, { releaseTo: user.department }]
      }),
      missed: await Document.countDocuments({
        releaseTo: user.department,
        deleted: false,
        accepted: false,
        viewed: false,
        createdAt: { $lt: today.toDate() }
      }),
      accepted: await Document.countDocuments({
        acceptedBy: userId,
        accepted: true,
        deleted: false,
        status: 'In-Review',
        createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() }
      }),
      pending: await Document.countDocuments({
        status: 'Pending',
        deleted: false,
        createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
        $or: [{ userId }, { acceptedBy: userId }, { releaseTo: user.department }]
      }),
      createdToday: await Document.countDocuments({
        userId,
        deleted: false,
        createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() }
      })
    };

    res.json(stats);
  } catch (err) {
    res.status(500).send('Error fetching stats: ' + err.message);
  }
});

app.get('/api/documents/:userId/pending', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const today = getLastResetTime();
    const tomorrow = today.clone().add(1, 'day');
    const documents = await Document.find({
      status: 'Pending',
      deleted: false,
      createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
      $or: [
        { userId },
        { acceptedBy: userId },
        { releaseTo: user.department }
      ]
    }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).send('Error fetching pending documents: ' + err.message);
  }
});

app.get('/api/documents/:userId/completed-today', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const today = getLastResetTime();
    const tomorrow = today.clone().add(1, 'day');
    const documents = await Document.find({
      status: 'Completed',
      deleted: false,
      updatedAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
      $or: [
        { userId },
        { acceptedBy: userId }
      ]
    }).sort({ updatedAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).send('Error fetching completed-today documents: ' + err.message);
  }
});

app.get('/api/documents/:userId/urgent', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const today = getLastResetTime();
    const tomorrow = today.clone().add(1, 'day');
    const documents = await Document.find({
      urgent: true,
      deleted: false,
      createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
      $or: [
        { userId },
        { acceptedBy: userId },
        { releaseTo: user.department }
      ]
    }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).send('Error fetching urgent documents: ' + err.message);
  }
});

app.get('/api/documents/:userId/missed', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send('Invalid User ID');
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');
    const today = getLastResetTime();
    const documents = await Document.find({
      releaseTo: user.department,
      deleted: false,
      accepted: false,
      viewed: false,
      createdAt: { $lt: today.toDate() }
    }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).send('Error fetching missed documents: ' + err.message);
  }
});

app.get('/api/documents/:userId/archive', async (req, res) => {
  try {
    const docs = await Document.find({ 
      $or: [
        { userId: req.params.userId, status: 'Archived', deleted: false },
        { acceptedBy: req.params.userId, status: 'Archived', deleted: false }
      ]
    }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).send('Error fetching archived documents: ' + err.message);
  }
});

app.put('/api/documents/:id/archive', async (req, res) => {
  try {
    const docId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(docId)) return res.status(400).send('Invalid Document ID');
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(404).send('User not found');
    const doc = await Document.findByIdAndUpdate(
      docId,
      { 
        status: 'Archived',
        $push: { history: { action: 'Archived', department: req.body.department || user.department, date: new Date(), routedBy: req.body.userId, routedByUsername: user.username } }
      },
      { new: true }
    );
    if (!doc) return res.status(404).send('Document not found');
    io.to(doc._id.toString()).emit('documentUpdate', { id: doc._id, action: 'archived' });
    res.json(doc);
  } catch (err) {
    res.status(500).send('Error archiving document: ' + err.message);
  }
});

app.put('/api/documents/:id/unarchive', async (req, res) => {
  try {
    const docId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(docId)) return res.status(400).send('Invalid Document ID');
    const doc = await Document.findById(docId);
    if (!doc) return res.status(404).send('Document not found');
    if (doc.status !== 'Archived') return res.status(400).send('Document is not archived');
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(404).send('User not found');
    doc.status = doc.accepted ? 'In-Review' : 'Pending';
    doc.history.push({ 
      action: 'Unarchived', 
      department: req.body.department || user.department, 
      date: new Date(),
      routedBy: req.body.userId,
      routedByUsername: user.username
    });
    await doc.save();
    io.to(doc._id.toString()).emit('documentUpdate', { id: doc._id, action: 'unarchived' });
    res.json(doc);
  } catch (err) {
    res.status(500).send('Error unarchiving document: ' + err.message);
  }
});

app.put('/api/documents/:id/complete', async (req, res) => {
  try {
    const docId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(docId)) return res.status(400).send('Invalid Document ID');
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(404).send('User not found');
    const doc = await Document.findByIdAndUpdate(
      docId,
      { 
        status: 'Completed',
        updatedAt: new Date(),
        $push: { history: { action: 'Completed', department: req.body.department || user.department, date: new Date(), routedBy: req.body.userId, routedByUsername: user.username } }
      },
      { new: true }
    );
    if (!doc) return res.status(404).send('Document not found');
    io.to(doc._id.toString()).emit('documentUpdate', { id: doc._id, action: 'completed' });
    res.json(doc);
  } catch (err) {
    res.status(500).send('Error marking document as completed: ' + err.message);
  }
});

// Cron job for missed documents at 8 AM PHT
cron.schedule('0 8 * * *', async () => {
  console.log('Running missed documents cron job at 8 AM PHT');
  try {
    const today = getLastResetTime();
    const documents = await Document.find({
      accepted: false,
      deleted: false,
      viewed: false,
      createdAt: { $lt: today.toDate() }
    });
    for (const doc of documents) {
      doc.history.push({
        action: 'Missed',
        department: doc.releaseTo,
        date: new Date(),
      });
      await doc.save();
      io.to(doc._id.toString()).emit('documentUpdate', { id: doc._id, action: 'missed' });
    }
  } catch (err) {
    console.error('Error in missed documents cron job:', err);
  }
}, {
  timezone: 'Asia/Manila'
});
// Cron job for trash deletion at 8 AM PHT
cron.schedule('0 8 * * *', async () => {
  console.log('Running permanent deletion cron job at 8 AM PHT');
  try {
    const thirtyDaysAgo = moment.tz('Asia/Manila').subtract(30, 'days').toDate();
    await Document.deleteMany({ deleted: true, deletedAt: { $lte: thirtyDaysAgo } });
  } catch (err) {
    console.error('Error in permanent deletion cron job:', err);
  }
}, {
  timezone: 'Asia/Manila'
});

const PORT = 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));