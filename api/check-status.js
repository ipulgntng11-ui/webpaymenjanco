const { cekStatusPakasir } = require('../payment-core');
const config = require('../config');

module.exports = async (req, res) => {
  // Set headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Get parameters from GET or POST
    let orderId, amount;
    
    if (req.method === 'GET') {
      orderId = req.query.orderId;
      amount = req.query.amount;
    } else {
      orderId = req.body.orderId;
      amount = req.body.amount;
    }
    
    // Validasi parameter
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID diperlukan',
        paid: false
      });
    }
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount diperlukan',
        paid: false
      });
    }
    
    // Konfigurasi Pakasir
    const paymentConfig = {
      payment: {
        pakasir: {
          apiKey: config.pakasir.apiKey,
          baseUrl: config.pakasir.baseUrl
        }
      }
    };
    
    console.log(`[API] Check status: ${orderId}, Amount: ${amount}`);
    
    // Cek status pembayaran
    const isPaid = await cekStatusPakasir(orderId, parseInt(amount), paymentConfig);
    
    return res.status(200).json({
      success: true,
      paid: isPaid,
      orderId: orderId,
      amount: parseInt(amount),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API STATUS ERROR]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      paid: false
    });
  }
};