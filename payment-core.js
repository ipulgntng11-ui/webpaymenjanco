/**
 * ============================================
 * PAYMENT CORE ENGINE - PAKASIR INTEGRATION
 * ============================================
 * Support: QRIS Otomatis + Manual Payment
 * Nominal: Rp1.000 - Rp10.000.000
 * 
 */

const axios = require("axios");
const QRCode = require("qrcode");

/**
 * Format angka ke Rupiah
 * @param {number} angka 
 * @returns {string}
 */
const toRupiah = (angka) => {
  return Number(angka).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).replace("IDR", "Rp").trim();
};

/**
 * Generate ID Transaksi unik
 * @returns {string}
 */
function generateReffId() {
  const prefix = "PAY";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate Order ID untuk Pakasir
 * @returns {string}
 */
function generateOrderId() {
  const date = new Date();
  const ymd = date.toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
  return `INV-${ymd}-${random}`;
}

/**
 * ============================================
 * PAKASIR API FUNCTIONS
 * ============================================
 */

/**
 * Membuat transaksi QRIS di Pakasir
 * @param {number} amount - Nominal pembayaran
 * @param {string} orderId - Order ID (opsional)
 * @param {object} config - Konfigurasi Pakasir
 * @returns {Promise<object>}
 */
async function createQrisPakasir(amount, orderId, config) {
  try {
    const { apiKey, storeName, baseUrl, webhookUrl, timeout } = config.payment?.pakasir || config;
    
    // ============= VALIDASI KONFIGURASI =============
    if (!apiKey) throw new Error("API Key Pakasir tidak boleh kosong!");
    if (apiKey.includes("ISI_API_KEY")) throw new Error("API Key Pakasir masih default! Ganti di config.js");
    if (!storeName) throw new Error("Store Name tidak boleh kosong!");
    if (!baseUrl) throw new Error("Base URL Pakasir tidak boleh kosong!");
    if (storeName.includes("TOKO_ANDA")) throw new Error("Store Name masih default! Ganti di config.js");
    
    // ============= VALIDASI NOMINAL =============
    if (amount < 1000) throw new Error("Minimal pembayaran Rp 1.000");
    if (amount > 10000000) throw new Error("Maksimal pembayaran Rp 10.000.000");
    
    const uniqueOrderId = orderId || generateOrderId();
    
    console.log("=========================================");
    console.log("[PAKASIR] CREATE TRANSACTION");
    console.log("=========================================");
    console.log("Amount     : Rp", amount.toLocaleString());
    console.log("Order ID   :", uniqueOrderId);
    console.log("Store Name :", storeName);
    console.log("API Key    :", apiKey.substring(0, 8) + "...");
    console.log("Base URL   :", baseUrl);
    console.log("Webhook    :", webhookUrl || "Not set");
    console.log("=========================================");
    
    // ============= REQUEST KE PAKASIR =============
    let response;
    try {
      response = await axios.post(
        `${baseUrl}/api/transaction/create`,
        {
          api_key: apiKey,
          amount: parseInt(amount),
          order_id: uniqueOrderId,
          store_name: storeName,
          payment_method: "qris",
          description: `Pembayaran ${storeName} - ${uniqueOrderId}`,
          customer_name: "Customer",
          customer_email: "customer@payment.com",
          redirect_url: "https://t.me/kinzxxoffcial",
          webhook_url: webhookUrl || "https://t.me/kinzxxoffcial",
          expiry_minutes: 15
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Payment-Gateway/3.0"
          },
          timeout: timeout || 15000
        }
      );
    } catch (axiosError) {
      console.error("[PAKASIR ERROR] AXIOS:", axiosError.message);
      
      // ============= HANDLING ERROR SPESIFIK =============
      if (axiosError.code === 'ECONNABORTED') {
        throw new Error("Timeout: Server Pakasir lambat merespons");
      }
      
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data;
        
        console.error("[PAKASIR RESPONSE] Status:", status);
        console.error("[PAKASIR RESPONSE] Data:", data);
        
        // Jika response HTML (bukan JSON)
        if (typeof data === 'string' && data.includes('<!DOCTYPE')) {
          throw new Error(`Endpoint Pakasir salah atau tidak aktif! Status: ${status}`);
        }
        
        // Error berdasarkan status code
        if (status === 401) throw new Error("API Key Pakasir tidak valid!");
        if (status === 403) throw new Error("IP Address tidak terdaftar di whitelist Pakasir!");
        if (status === 404) throw new Error("Endpoint Pakasir tidak ditemukan! Cek baseUrl di config.js");
        if (status === 429) throw new Error("Terlalu banyak request, coba lagi nanti");
        if (status >= 500) throw new Error("Server Pakasir sedang bermasalah, coba lagi nanti");
        
        throw new Error(`Pakasir error (${status}): ${JSON.stringify(data)}`);
      }
      
      if (axiosError.request) {
        throw new Error("Tidak dapat terhubung ke server Pakasir. Cek koneksi internet atau baseUrl");
      }
      
      throw new Error(axiosError.message);
    }
    
    // ============= VALIDASI RESPONSE =============
    if (!response) throw new Error("Response kosong dari server Pakasir");
    if (!response.data) throw new Error("Data response kosong dari server Pakasir");
    
    console.log("[PAKASIR] Response Status:", response.status);
    console.log("[PAKASIR] Response Data:", JSON.stringify(response.data, null, 2));
    
    if (!response.data.success) {
      throw new Error(response.data.message || "Gagal membuat transaksi di Pakasir");
    }
    
    const data = response.data.data || response.data;
    if (!data) throw new Error("Data transaksi kosong");
    
    // ============= AMBIL PAYMENT URL =============
    const paymentUrl = data.payment_url || data.qr_string || data.qr_url || 
                      data.qr_code || data.url || `${baseUrl}/pay/${storeName}/${uniqueOrderId}`;
    
    if (!paymentUrl) {
      console.warn("[PAKASIR] Payment URL tidak ditemukan, generate manual");
    }
    
    // ============= GENERATE QR CODE =============
    console.log("[QR] Generating QR Code from:", paymentUrl);
    
    let qrBuffer;
    try {
      qrBuffer = await QRCode.toBuffer(paymentUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      });
    } catch (qrError) {
      console.error("[QR ERROR] Gagal generate QR Code:", qrError.message);
      throw new Error("Gagal generate QR Code");
    }
    
    // ============= RETURN SUKSES =============
    return {
      success: true,
      data: {
        idtransaksi: data.order_id || data.id || uniqueOrderId,
        orderId: data.order_id || data.id || uniqueOrderId,
        jumlah: parseInt(amount),
        amount: parseInt(amount),
        imageqris: qrBuffer,
        qr_string: paymentUrl,
        payment_url: paymentUrl,
        merchant_name: data.store_name || storeName,
        merchant: data.store_name || storeName,
        expiry: data.expiry || null,
        created_at: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error("[PAKASIR FATAL ERROR]:", error.message);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Cek status pembayaran di Pakasir
 * @param {string} orderId - Order ID
 * @param {number} amount - Nominal pembayaran
 * @param {object} config - Konfigurasi Pakasir
 * @returns {Promise<boolean>}
 */
async function cekStatusPakasir(orderId, amount, config) {
  try {
    const { apiKey, baseUrl } = config.payment?.pakasir || config;
    
    if (!apiKey) return false;
    if (!baseUrl) return false;
    if (!orderId) return false;
    
    console.log(`[PAKASIR] Checking status: ${orderId}`);
    
    let response;
    try {
      response = await axios.get(
        `${baseUrl}/api/transaction/status/${orderId}`,
        {
          headers: {
            "X-API-Key": apiKey,
            "Accept": "application/json"
          },
          timeout: 10000
        }
      );
    } catch (axiosError) {
      console.error("[PAKASIR STATUS ERROR]", axiosError.message);
      return false;
    }
    
    if (!response.data) return false;
    
    const data = response.data.data || response.data;
    const status = (data.status || "").toLowerCase();
    const responseAmount = parseInt(data.amount || data.nominal || 0);
    
    // Status sukses dari berbagai provider
    const successStatus = ["paid", "success", "settlement", "capture", 
                          "settled", "completed", "sukses", "lunas", "berhasil"];
    
    const isPaid = successStatus.includes(status) && responseAmount === parseInt(amount);
    
    if (isPaid) {
      console.log(`✅ [PAKASIR] PAYMENT SUCCESS! Order: ${orderId}, Amount: ${responseAmount}`);
    }
    
    return isPaid;
    
  } catch (error) {
    console.error("[PAKASIR STATUS FATAL]:", error.message);
    return false;
  }
}

/**
 * ============================================
 * MAIN CREATE PAYMENT FUNCTION
 * ============================================
 */
async function createdQris(harga, config) {
  const amount = Number(harga);
  
  // Validasi nominal
  if (amount < 1000) return null;
  if (amount > 10000000) return null;
  
  // ============= PAKASIR =============
  try {
    const result = await createQrisPakasir(amount, null, config);
    
    if (!result || !result.success) {
      console.error("[CREATE QRIS] Pakasir gagal:", result?.message);
      return null;
    }
    
    return {
      idtransaksi: result.data.idtransaksi,
      orderId: result.data.orderId,
      jumlah: result.data.jumlah,
      amount: result.data.amount,
      imageqris: result.data.imageqris,
      qr_string: result.data.qr_string,
      payment_url: result.data.payment_url,
      nominal: amount,
      merchant_name: result.data.merchant_name,
      merchant: result.data.merchant,
      expiry: result.data.expiry
    };
    
  } catch (error) {
    console.error("[CREATE QRIS ERROR]:", error.message);
    return null;
  }
}

/**
 * ============================================
 * WEBHOOK HANDLER
 * ============================================
 */
async function handlePakasirWebhook(body, config) {
  try {
    console.log("[WEBHOOK] Processing webhook data...");
    
    // Extract data dari berbagai format
    const orderId = body.order_id || body.orderId || body.id || 
                    body.transaction_id || body.reff_id || body.invoice;
    
    const status = body.status || body.transaction_status || body.payment_status;
    
    const amount = body.amount || body.gross_amount || body.nominal || 
                  body.price || body.total;
    
    const signature = body.signature || body.hash || body.token;
    
    if (!orderId) {
      return {
        success: false,
        message: "Order ID tidak ditemukan dalam webhook"
      };
    }
    
    console.log(`[WEBHOOK] Order: ${orderId}, Status: ${status}, Amount: ${amount}`);
    
    // Status sukses
    const successStatus = ["paid", "success", "settlement", "capture", 
                          "settled", "completed", "sukses", "lunas", "berhasil"];
    
    const isPaid = successStatus.includes(status?.toLowerCase());
    
    return {
      success: true,
      orderId: orderId,
      status: status,
      amount: amount || 0,
      paid: isPaid,
      signature: signature,
      timestamp: new Date().toISOString(),
      raw: body
    };
    
  } catch (error) {
    console.error("[WEBHOOK ERROR]:", error.message);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * ============================================
 * EXPORT MODULES
 * ============================================
 */
module.exports = {
  // Core functions
  createQrisPakasir,
  cekStatusPakasir,
  createdQris,
  handlePakasirWebhook,
  
  // Utilities
  toRupiah,
  generateReffId,
  generateOrderId,
  
  // Constants
  MIN_AMOUNT: 1000,
  MAX_AMOUNT: 10000000,
  QRIS_EXPIRY: 900
};