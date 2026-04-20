const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET ||d28b560ebf319a183d79dec07f1d8f36 ;

// Middleware for authentication
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Role-based access control middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

// Database initialization
const initDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('Creating database tables...');
    
    // Create tables
    await client.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        full_name VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Patients table
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        uhid VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE NOT NULL,
        gender VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(200),
        address TEXT,
        emergency_contact VARCHAR(20),
        blood_group VARCHAR(5),
        allergies TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Medical history table
      CREATE TABLE IF NOT EXISTS medical_history (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        diagnosis TEXT,
        medications TEXT,
        surgeries TEXT,
        chronic_conditions TEXT,
        family_history TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Medicines table
      CREATE TABLE IF NOT EXISTS medicines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        generic_name VARCHAR(200),
        category VARCHAR(100),
        manufacturer VARCHAR(200),
        barcode VARCHAR(100) UNIQUE,
        unit_price DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Inventory table
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        medicine_id INTEGER REFERENCES medicines(id),
        batch_number VARCHAR(100),
        expiry_date DATE,
        quantity INTEGER DEFAULT 0,
        reorder_level INTEGER DEFAULT 10,
        location VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Central store inventory
      CREATE TABLE IF NOT EXISTS central_store_inventory (
        id SERIAL PRIMARY KEY,
        medicine_id INTEGER REFERENCES medicines(id),
        batch_number VARCHAR(100),
        expiry_date DATE,
        quantity INTEGER DEFAULT 0,
        reorder_level INTEGER DEFAULT 50,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Purchase orders
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE NOT NULL,
        supplier_name VARCHAR(200),
        order_date DATE,
        expected_delivery DATE,
        status VARCHAR(50),
        total_amount DECIMAL(10, 2),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Purchase order items
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id SERIAL PRIMARY KEY,
        po_id INTEGER REFERENCES purchase_orders(id),
        medicine_id INTEGER REFERENCES medicines(id),
        quantity INTEGER,
        unit_price DECIMAL(10, 2),
        total_price DECIMAL(10, 2)
      );

      -- Dispensing records
      CREATE TABLE IF NOT EXISTS dispensing_records (
        id SERIAL PRIMARY KEY,
        prescription_number VARCHAR(50) UNIQUE NOT NULL,
        patient_id INTEGER REFERENCES patients(id),
        medicine_id INTEGER REFERENCES medicines(id),
        quantity INTEGER,
        unit_price DECIMAL(10, 2),
        total_price DECIMAL(10, 2),
        dispensed_by INTEGER REFERENCES users(id),
        dispensed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Billing records
      CREATE TABLE IF NOT EXISTS billing_records (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        patient_id INTEGER REFERENCES patients(id),
        dispensing_id INTEGER REFERENCES dispensing_records(id),
        amount DECIMAL(10, 2),
        tax DECIMAL(10, 2),
        total_amount DECIMAL(10, 2),
        payment_method VARCHAR(50),
        payment_status VARCHAR(50),
        billed_by INTEGER REFERENCES users(id),
        billed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Audit logs
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(200),
        module VARCHAR(100),
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if users exist
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) === 0) {
      // Insert default users
      const defaultUsers = [
        ['admin', await bcrypt.hash('admin123', 10), 'admin', 'System Administrator'],
        ['doctor1', await bcrypt.hash('doctor123', 10), 'doctor', 'Dr. Smith'],
        ['pharmacist1', await bcrypt.hash('pharm123', 10), 'pharmacist', 'John Pharmacist'],
        ['cashier1', await bcrypt.hash('cash123', 10), 'cashier', 'Mary Cashier']
      ];
      
      for (const user of defaultUsers) {
        await client.query(
          'INSERT INTO users (username, password, role, full_name) VALUES ($1, $2, $3, $4)',
          user
        );
      }
      console.log('Default users created');
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  } finally {
    client.release();
  }
};

// ==================== AUTHENTICATION ROUTES ====================
app.post('/api/login', [
  body('username').notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== PATIENT REGISTRATION ROUTES ====================
app.post('/api/patients', authenticate, requireRole(['admin', 'doctor', 'receptionist']), [
  body('first_name').notEmpty(),
  body('last_name').notEmpty(),
  body('date_of_birth').notEmpty(),
  body('gender').notEmpty(),
  body('phone').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { first_name, last_name, date_of_birth, gender, phone, email, address, emergency_contact, blood_group, allergies, medical_history } = req.body;
  
  try {
    // Generate UHID
    const uhid = 'UHID' + Date.now();
    
    const result = await pool.query(
      `INSERT INTO patients (uhid, first_name, last_name, date_of_birth, gender, phone, email, address, emergency_contact, blood_group, allergies)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [uhid, first_name, last_name, date_of_birth, gender, phone, email, address, emergency_contact, blood_group, allergies]
    );
    
    // Add medical history if provided
    if (medical_history) {
      await pool.query(
        `INSERT INTO medical_history (patient_id, diagnosis, medications, surgeries, chronic_conditions, family_history)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [result.rows[0].id, medical_history.diagnosis, medical_history.medications, medical_history.surgeries, medical_history.chronic_conditions, medical_history.family_history]
      );
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register patient' });
  }
});

app.get('/api/patients', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

app.get('/api/patients/:id', authenticate, async (req, res) => {
  try {
    const patient = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    const medicalHistory = await pool.query('SELECT * FROM medical_history WHERE patient_id = $1', [req.params.id]);
    
    res.json({
      ...patient.rows[0],
      medical_history: medicalHistory.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// ==================== PHARMACY ROUTES ====================
app.post('/api/medicines', authenticate, requireRole(['admin', 'pharmacist']), [
  body('name').notEmpty(),
  body('barcode').notEmpty(),
  body('unit_price').isNumeric()
], async (req, res) => {
  const { name, generic_name, category, manufacturer, barcode, unit_price } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO medicines (name, generic_name, category, manufacturer, barcode, unit_price)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, generic_name, category, manufacturer, barcode, unit_price]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add medicine' });
  }
});

app.get('/api/medicines', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (m.id) m.*, COALESCE(i.quantity, 0) as stock_quantity
      FROM medicines m
      LEFT JOIN inventory i ON m.id = i.medicine_id
      ORDER BY m.id, m.name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
});

app.get('/api/medicines/barcode/:barcode', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, COALESCE(i.quantity, 0) as stock_quantity
      FROM medicines m
      LEFT JOIN inventory i ON m.id = i.medicine_id
      WHERE m.barcode = $1
    `, [req.params.barcode]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch medicine' });
  }
});

app.post('/api/dispense', authenticate, requireRole(['pharmacist']), [
  body('patient_id').isNumeric(),
  body('medicine_id').isNumeric(),
  body('quantity').isNumeric()
], async (req, res) => {
  const { patient_id, medicine_id, quantity, prescription_number } = req.body;
  
  try {
    // Check stock
    const inventoryCheck = await pool.query(
      'SELECT COALESCE(SUM(quantity), 0) as total_quantity FROM inventory WHERE medicine_id = $1',
      [medicine_id]
    );
    
    if (inventoryCheck.rows[0].total_quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    // Get medicine price
    const medicine = await pool.query('SELECT unit_price FROM medicines WHERE id = $1', [medicine_id]);
    const total_price = medicine.rows[0].unit_price * quantity;
    
    // Create dispensing record
    const prescNumber = prescription_number || 'RX' + Date.now();
    const result = await pool.query(
      `INSERT INTO dispensing_records (prescription_number, patient_id, medicine_id, quantity, unit_price, total_price, dispensed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [prescNumber, patient_id, medicine_id, quantity, medicine.rows[0].unit_price, total_price, req.user.id]
    );
    
    // Update inventory (reduce from one batch)
    await pool.query(
      'UPDATE inventory SET quantity = quantity - $1 WHERE medicine_id = $2 AND quantity > 0 LIMIT 1',
      [quantity, medicine_id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to dispense medicine' });
  }
});

app.get('/api/dispensing', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, 
             p.first_name, p.last_name, p.uhid,
             m.name as medicine_name,
             CASE WHEN b.id IS NOT NULL THEN true ELSE false END as billed
      FROM dispensing_records d
      LEFT JOIN patients p ON d.patient_id = p.id
      LEFT JOIN medicines m ON d.medicine_id = m.id
      LEFT JOIN billing_records b ON d.id = b.dispensing_id
      ORDER BY d.dispensed_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dispensing records' });
  }
});

// ==================== CASHIER ROUTES ====================
app.post('/api/billing', authenticate, requireRole(['cashier', 'admin']), [
  body('dispensing_id').isNumeric(),
  body('payment_method').notEmpty()
], async (req, res) => {
  const { dispensing_id, payment_method, discount } = req.body;
  
  try {
    const dispensing = await pool.query(
      'SELECT * FROM dispensing_records WHERE id = $1',
      [dispensing_id]
    );
    
    if (dispensing.rows.length === 0) {
      return res.status(404).json({ error: 'Dispensing record not found' });
    }
    
    const amount = dispensing.rows[0].total_price;
    const tax = amount * 0.05;
    const total_amount = amount + tax - (discount || 0);
    const invoice_number = 'INV' + Date.now();
    
    const result = await pool.query(
      `INSERT INTO billing_records (invoice_number, patient_id, dispensing_id, amount, tax, total_amount, payment_method, payment_status, billed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [invoice_number, dispensing.rows[0].patient_id, dispensing_id, amount, tax, total_amount, payment_method, 'COMPLETED', req.user.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process billing' });
  }
});

app.get('/api/billing', authenticate, requireRole(['cashier', 'admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, p.first_name, p.last_name, p.uhid, d.prescription_number
      FROM billing_records b
      JOIN patients p ON b.patient_id = p.id
      JOIN dispensing_records d ON b.dispensing_id = d.id
      ORDER BY b.billed_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch billing records' });
  }
});

// ==================== CENTRAL STORE ROUTES ====================
app.post('/api/central-store/purchase-order', authenticate, requireRole(['admin']), async (req, res) => {
  const { supplier_name, items, expected_delivery } = req.body;
  
  try {
    const po_number = 'PO' + Date.now();
    
    const result = await pool.query(
      `INSERT INTO purchase_orders (po_number, supplier_name, order_date, expected_delivery, status, total_amount, created_by)
       VALUES ($1, $2, CURRENT_DATE, $3, 'PENDING', $4, $5) RETURNING *`,
      [po_number, supplier_name, expected_delivery, 0, req.user.id]
    );
    
    let total_amount = 0;
    for (const item of items) {
      const itemTotal = item.quantity * item.unit_price;
      total_amount += itemTotal;
      
      await pool.query(
        `INSERT INTO purchase_order_items (po_id, medicine_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [result.rows[0].id, item.medicine_id, item.quantity, item.unit_price, itemTotal]
      );
    }
    
    await pool.query(
      'UPDATE purchase_orders SET total_amount = $1 WHERE id = $2',
      [total_amount, result.rows[0].id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

app.get('/api/central-store/purchase-orders', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT po.*, u.username as created_by_name
      FROM purchase_orders po
      LEFT JOIN users u ON po.created_by = u.id
      ORDER BY po.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

app.post('/api/central-store/receive-stock', authenticate, requireRole(['admin']), async (req, res) => {
  const { po_id, items } = req.body;
  
  try {
    for (const item of items) {
      // Update or insert into central store inventory
      await pool.query(
        `INSERT INTO central_store_inventory (medicine_id, batch_number, expiry_date, quantity, reorder_level)
         VALUES ($1, $2, $3, $4, 50)
         ON CONFLICT (medicine_id, batch_number) 
         DO UPDATE SET quantity = central_store_inventory.quantity + $4`,
        [item.medicine_id, item.batch_number, item.expiry_date, item.quantity]
      );
      
      // Also update pharmacy inventory
      await pool.query(
        `INSERT INTO inventory (medicine_id, batch_number, expiry_date, quantity, reorder_level)
         VALUES ($1, $2, $3, $4, 10)
         ON CONFLICT (medicine_id, batch_number) 
         DO UPDATE SET quantity = inventory.quantity + $4`,
        [item.medicine_id, item.batch_number, item.expiry_date, item.quantity]
      );
    }
    
    await pool.query(
      'UPDATE purchase_orders SET status = $1 WHERE id = $2',
      ['COMPLETED', po_id]
    );
    
    res.json({ message: 'Stock received successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to receive stock' });
  }
});

app.get('/api/central-store/inventory', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT csi.*, m.name, m.category, m.manufacturer
      FROM central_store_inventory csi
      JOIN medicines m ON csi.medicine_id = m.id
      ORDER BY m.name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

app.get('/api/audit-logs', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📋 API available at http://localhost:${PORT}/api`);
      console.log(`💚 Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
