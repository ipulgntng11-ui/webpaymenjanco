const { handlePakasirWebhook } = require('../payment-core');
const config = require('../config');

module.exports = async (req, res) => {
  // Set headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET method untuk test endpoint
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: '✅ Webhook endpoint Pakasir aktif!',
      timestamp: new Date().toISOString(),
      config: {
        store: config.pakasir.storeName,
        webhook_url: config.pakasir.webhookUrl,
        status: 'ready',
        min_amount: 1000,
        max_amount: 10000000
      },
      instructions: [
        "1. Set webhook URL ini di dashboard Pakasir",
        "2. Pilih event: payment.success / transaction.paid",
        "3. Test kirim POST request ke endpoint ini"
      ]
    });
  }
  
  // Only POST for webhook
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
  
  try {
    const body = req.body;
    
    // Logging lengkap
    console.log('\n=========================================');
    console.log('🚀 WEBHOOK PAKASIR RECEIVED');
    console.log('=========================================');
    console.log('Time    :', new Date().toISOString());
    console.log('Method  :', req.method);
    console.log('Headers :', JSON.stringify(req.headers, null, 2));
    console.log('Body    :', JSON.stringify(body, null, 2));
    console.log('=========================================\n');
    
    // Validasi body
    if (!body || Object.keys(body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body is empty'
      });
    }
    
    // Process webhook
    const result = await handlePakasirWebhook(body, config.pakasir);
    
    // Jika pembayaran sukses
    if (result.success && result.paid) {
      console.log('\n🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉');
      console.log('✅ PEMBAYARAN SUKSES!');
      console.log('🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉');
      console.log('Order ID :', result.orderId);
      console.log('Amount   : Rp', Number(result.amount).toLocaleString());
      console.log('Status   :', result.status);
      console.log('Time     :', result.timestamp);
      console.log('=========================================\n');
      
      // TODO: Kirim notifikasi Telegram/WhatsApp
      // if (config.telegramBot.enabled) {
      //   await sendTelegramNotification(result);
      // }
    }
    
    // Selalu return 200 OK ke Pakasir
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      data: result
    });
    
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error.message);
    
    // Tetap return 200 agar Pakasir berhenti mengirim
    return res.status(200).json({
      success: false,
      message: error.message
    });
  }
};