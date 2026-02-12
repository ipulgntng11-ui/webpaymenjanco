/**
 * ============================================
 * KONFIGURASI PAYMENT GATEWAY - FULL VERSION
 * ============================================
 * 
 * ⚠️ WAJIB: GANTI API KEY DAN STORE NAME DENGAN PUNYA ANDA!
 * ⚠️ WAJIB: SET WEBHOOK URL SESUAI DOMAIN VERCEL ANDA!
 * 
 */

module.exports = {
  // ============= PAKASIR (QRIS OTOMATIS) =============
  pakasir: {
    // 🔴🔴🔴 GANTI INI DENGAN API KEY ASLI DARI PAKASIR! 🔴🔴🔴
    apiKey: "vL86teuaOghrjUsoFp10WmuOESQwQ6bc",
    
    // 🔴🔴🔴 GANTI DENGAN NAMA TOKO ANDA! 🔴🔴🔴
    storeName: "bot-bos",
    
    // 🔴🔴🔴 PASTIKAN BASE URL SESUAI DOKUMENTASI PAKASIR! 🔴🔴🔴
    baseUrl: "https://api.pakasir.com",  // ATAU "https://app.pakasir.com/api"
    
    // 🔴🔴🔴 GANTI DENGAN DOMAIN VERCEL ANDA! 🔴🔴🔴
    webhookUrl: "https://webpaymen-ruddy.vercel.app/api/pakasir-webhook",
    
    // Timeout dalam milidetik
    timeout: 15000
  },
  
  // ============= ENDPOINT ALTERNATIF (CADANGAN) =============
  // UNTUK TESTING ATAU FALLBACK
  fallback: {
    enabled: false,
    baseUrl: "https://app.pakasir.com/api",
    apiKey: "vL86teuaOghrjUsoFp10WmuOESQwQ6bc"
  },
  
  // ============= PEMBAYARAN MANUAL =============
  manualPayment: {
    dana: {
      number: "085713933912",
      name: "KINZXXOFFCIAL"
    },
    gopay: {
      number: "085713933912",
      name: "KINZXXOFFCIAL"
    }
  },
  
  // ============= KONTAK SUPPORT =============
  support: {
    telegram: "@kinzxxoffcial",
    telegramLink: "https://t.me/kinzxxoffcial",
    whatsapp: "0895379234782",
    whatsappLink: "https://wa.me/62895379234782",
    email: "support@kinzxxoffcial.com"
  },
  
  // ============= PENGATURAN PAYMENT =============
  payment: {
    minAmount: 1000,        // MIN: Rp 1.000
    maxAmount: 10000000,    // MAX: Rp 10.000.000
    qrisExpiry: 900,       // 15 menit dalam detik
    checkInterval: 3000    // Cek status tiap 3 detik
  },
  
  // ============= TELEGRAM BOT NOTIFICATION =============
  // OPSIONAL: Untuk notifikasi pembayaran masuk
  telegramBot: {
    enabled: false,
    token: "8532673742:AAGu8GCGP2FpIndbJUT8uVdsRtJeRUxOaNg",  // Bot token dari @BotFather
    chatId: "6797348304"  // Chat ID tujuan notifikasi
  }
};