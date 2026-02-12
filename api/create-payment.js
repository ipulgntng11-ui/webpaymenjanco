const { createdQris, toRupiah } = require('../payment-core');
const config = require('../config');

module.exports = async (req, res) => {
  // Set headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
  
  try {
    const { amount } = req.body;
    
    // Validasi nominal
    if (!amount && amount !== 0) {
      return res.status(400).json({
        success: false,
        message: 'Nominal tidak boleh kosong'
      });
    }
    
    const nominal = parseInt(amount);
    
    // Validasi range: 1.000 - 10.000.000
    if (isNaN(nominal) || nominal < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimal pembayaran Rp 1.000'
      });
    }
    
    if (nominal > 10000000) {
      return res.status(400).json({
        success: false,
        message: 'Maksimal pembayaran Rp 10.000.000'
      });
    }
    
    // Validasi API Key
    if (!config.pakasir.apiKey || config.pakasir.apiKey.includes("ISI_API_KEY")) {
      return res.status(500).json({
        success: false,
        message: 'Konfigurasi API Key Pakasir belum diisi. Hubungi admin!'
      });
    }
    
    // Validasi Store Name
    if (!config.pakasir.storeName || config.pakasir.storeName.includes("TOKO_ANDA")) {
      return res.status(500).json({
        success: false,
        message: 'Konfigurasi Store Name Pakasir belum diisi. Hubungi admin!'
      });
    }
    
    // Konfigurasi payment
    const paymentConfig = {
      payment: {
        pakasir: {
          apiKey: config.pakasir.apiKey,
          storeName: config.pakasir.storeName,
          baseUrl: config.pakasir.baseUrl,
          webhookUrl: config.pakasir.webhookUrl,
          timeout: config.pakasir.timeout || 15000
        }
      }
    };
    
    console.log(`[API] Create payment request: Rp ${nominal.toLocaleString()}`);
    
    // Create payment
    const payment = await createdQris(nominal, paymentConfig);
    
    if (!payment) {
      return res.status(500).json({
        success: false,
        message: 'Gagal membuat QRIS. Cek API Key dan koneksi ke Pakasir!'
      });
    }
    
    // Convert QR buffer to base64
    let qrBase64 = null;
    if (payment.imageqris && Buffer.isBuffer(payment.imageqris)) {
      qrBase64 = `data:image/png;base64,${payment.imageqris.toString('base64')}`;
    }
    
    // Response sukses
    return res.status(200).json({
      success: true,
      message: 'QRIS berhasil dibuat',
      data: {
        id: payment.idtransaksi,
        orderId: payment.orderId || payment.idtransaksi,
        amount: payment.jumlah,
        amountFormatted: toRupiah(payment.jumlah),
        qrCode: qrBase64,
        qrString: payment.qr_string,
        paymentUrl: payment.payment_url,
        merchant: payment.merchant_name || payment.merchant || 'QRIS Payment',
        expiry: payment.expiry || '15 menit',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[API CREATE ERROR]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server: ' + error.message
    });
  }
};