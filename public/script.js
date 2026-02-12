/**
 * ============================================
 * PAYMENT GATEWAY FRONTEND - FULL VERSION
 * ============================================
 * Support: QRIS Otomatis (Pakasir) & Transfer Manual
 * Nominal: Rp1.000 - Rp10.000.000 (BEBAS!)
 * 
 */

// ============= KONFIGURASI =============
const CONFIG = {
  API_BASE: window.location.origin,
  MIN_AMOUNT: 1000,
  MAX_AMOUNT: 10000000,
  QRIS_EXPIRY: 900, // 15 menit dalam detik
  CHECK_INTERVAL: 3000, // 3 detik
  SUPPORT: {
    TELEGRAM: "@kinzxxoffcial",
    TELEGRAM_LINK: "https://t.me/kinzxxoffcial",
    WHATSAPP: "0895379234782",
    WHATSAPP_LINK: "https://wa.me/62895379234782"
  },
  MANUAL_PAYMENT: {
    DANA: "085713933912",
    GOPAY: "085713933912",
    ACCOUNT_NAME: "KINZXXOFFCIAL"
  }
};

// ============= STATE MANAGEMENT =============
let currentPayment = {
  id: null,
  orderId: null,
  amount: null,
  method: 'qris',
  qrCode: null,
  merchant: null,
  expiry: null
};

let countdownInterval = null;
let checkStatusInterval = null;
let isCheckingStatus = false;

// ============= DOM ELEMENTS =============
const elements = {
  amount: document.getElementById('amount'),
  chipButtons: document.querySelectorAll('.chip'),
  generateQrisBtn: document.getElementById('generate-qris'),
  checkPaymentBtn: document.getElementById('check-payment-btn'),
  qrisSection: document.getElementById('qris-payment-area'),
  loadingQr: document.getElementById('loading-qr'),
  qrisImage: document.getElementById('qris-image'),
  qrisAmount: document.getElementById('qris-amount'),
  orderIdSpan: document.getElementById('order-id'),
  merchantName: document.getElementById('merchant-name'),
  timerSpan: document.getElementById('timer'),
  methodTabs: document.querySelectorAll('.method-tab'),
  methodSections: document.querySelectorAll('.method-section'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message'),
  modal: document.getElementById('modal'),
  modalClose: document.querySelector('.modal-close'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  paymentStatusCard: document.getElementById('payment-status-card'),
  paymentStatusContent: document.getElementById('payment-status-content'),
  copyOrderBtn: document.getElementById('copy-order'),
  copyNumberBtns: document.querySelectorAll('.copy-number')
};

// ============= UTILITY FUNCTIONS =============

/**
 * Format angka ke format Rupiah
 * @param {number} angka 
 * @returns {string}
 */
function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(angka).replace('IDR', 'Rp').trim();
}

/**
 * Parse string Rupiah ke number
 * @param {string} rupiah 
 * @returns {number}
 */
function parseRupiah(rupiah) {
  return parseInt(rupiah.replace(/[^0-9]/g, '')) || 0;
}

/**
 * Show toast notification
 * @param {string} message 
 * @param {boolean} isSuccess 
 */
function showToast(message, isSuccess = true) {
  if (!elements.toast || !elements.toastMessage) return;
  
  elements.toastMessage.textContent = message;
  elements.toast.style.background = isSuccess 
    ? 'rgba(16, 185, 129, 0.95)' 
    : 'rgba(239, 68, 68, 0.95)';
  elements.toast.classList.add('show');
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

/**
 * Show success modal
 */
function showModal() {
  if (elements.modal) {
    elements.modal.classList.add('show');
  }
}

/**
 * Hide success modal
 */
function hideModal() {
  if (elements.modal) {
    elements.modal.classList.remove('show');
  }
}

/**
 * Stop all intervals (countdown & status check)
 */
function stopAllIntervals() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (checkStatusInterval) {
    clearInterval(checkStatusInterval);
    checkStatusInterval = null;
    isCheckingStatus = false;
  }
}

/**
 * Reset QRIS display
 */
function resetQRISDisplay() {
  if (elements.qrisSection) {
    elements.qrisSection.style.display = 'none';
  }
  if (elements.generateQrisBtn) {
    elements.generateQrisBtn.style.display = 'block';
  }
  if (elements.loadingQr) {
    elements.loadingQr.style.display = 'flex';
  }
  if (elements.qrisImage) {
    elements.qrisImage.style.display = 'none';
    elements.qrisImage.src = '';
  }
  if (elements.paymentStatusCard) {
    elements.paymentStatusCard.style.display = 'none';
  }
  
  currentPayment = {
    id: null,
    orderId: null,
    amount: null,
    method: 'qris',
    qrCode: null
  };
  
  stopAllIntervals();
}

/**
 * Validasi nominal pembayaran
 * @param {number} amount 
 * @returns {boolean}
 */
function validateAmount(amount) {
  if (!amount || amount < CONFIG.MIN_AMOUNT) {
    showToast(`❌ Minimal pembayaran ${formatRupiah(CONFIG.MIN_AMOUNT)}`, false);
    return false;
  }
  if (amount > CONFIG.MAX_AMOUNT) {
    showToast(`❌ Maksimal pembayaran ${formatRupiah(CONFIG.MAX_AMOUNT)}`, false);
    return false;
  }
  return true;
}

// ============= PAYMENT FUNCTIONS =============

/**
 * Generate QRIS via API
 * @param {number} amount 
 */
async function generateQRIS(amount) {
  if (!validateAmount(amount)) return;
  
  try {
    // Show loading state
    elements.generateQrisBtn.style.display = 'none';
    elements.qrisSection.style.display = 'block';
    elements.loadingQr.style.display = 'flex';
    elements.qrisImage.style.display = 'none';
    
    showToast(`⏳ Membuat QRIS ${formatRupiah(amount)}...`, true);
    
    // Call API
    const response = await fetch(`${CONFIG.API_BASE}/api/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ amount })
    });
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Response bukan JSON:', text.substring(0, 200));
      throw new Error('Server mengembalikan HTML/Plain text. Cek API Key Pakasir!');
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Gagal generate QRIS');
    }
    
    const data = result.data;
    
    // Save current payment
    currentPayment = {
      id: data.id,
      orderId: data.orderId || data.id,
      amount: data.amount,
      method: 'qris',
      qrCode: data.qrCode,
      merchant: data.merchant,
      expiry: data.expiry || '15 menit'
    };
    
    // Display QRIS
    elements.qrisImage.src = data.qrCode;
    elements.qrisAmount.textContent = data.amountFormatted;
    elements.orderIdSpan.textContent = data.orderId || data.id;
    elements.merchantName.textContent = data.merchant || 'QRIS Payment';
    
    // Hide loading, show QR
    elements.loadingQr.style.display = 'none';
    elements.qrisImage.style.display = 'block';
    
    // Start countdown (15 menit)
    startCountdown(CONFIG.QRIS_EXPIRY);
    
    // Start checking payment status
    startCheckingStatus(data.orderId || data.id, data.amount);
    
    showToast('✅ QRIS berhasil dibuat!', true);
    
  } catch (error) {
    console.error('Generate QRIS error:', error);
    showToast('❌ ' + (error.message || 'Gagal generate QRIS'), false);
    
    // Reset
    elements.generateQrisBtn.style.display = 'block';
    elements.qrisSection.style.display = 'none';
    elements.loadingQr.style.display = 'none';
  }
}

/**
 * Start countdown timer
 * @param {number} seconds 
 */
function startCountdown(seconds) {
  stopAllIntervals();
  
  let timeLeft = seconds;
  
  countdownInterval = setInterval(() => {
    const minutes = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    elements.timerSpan.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      elements.timerSpan.textContent = '00:00';
      
      // Auto hide QRIS jika expired
      if (confirm('⏰ QRIS telah kadaluarsa. Buat ulang?')) {
        const amount = parseRupiah(elements.amount.value);
        if (validateAmount(amount)) {
          generateQRIS(amount);
        }
      } else {
        resetQRISDisplay();
      }
    }
    
    timeLeft--;
  }, 1000);
}

/**
 * Start checking payment status
 * @param {string} orderId 
 * @param {number} amount 
 */
function startCheckingStatus(orderId, amount) {
  if (isCheckingStatus) {
    clearInterval(checkStatusInterval);
  }
  
  isCheckingStatus = true;
  
  checkStatusInterval = setInterval(async () => {
    try {
      const response = await fetch(
        `${CONFIG.API_BASE}/api/check-status?orderId=${encodeURIComponent(orderId)}&amount=${amount}`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.paid) {
        // Payment success!
        clearInterval(checkStatusInterval);
        clearInterval(countdownInterval);
        isCheckingStatus = false;
        
        // Show success modal
        showModal();
        
        // Update status card
        elements.paymentStatusCard.style.display = 'block';
        elements.paymentStatusContent.innerHTML = `
          <div style="text-align: center; padding: 24px;">
            <i class="fas fa-check-circle" style="font-size: 72px; color: #4CAF50; margin-bottom: 20px;"></i>
            <h3 style="color: #4CAF50; font-size: 26px; margin-bottom: 16px;">PEMBAYARAN BERHASIL!</h3>
            <p style="color: white; font-size: 20px; font-weight: 700; margin-bottom: 12px;">${formatRupiah(amount)}</p>
            <p style="color: var(--gray); margin-bottom: 20px; word-break: break-all;">ID: ${orderId}</p>
            <div style="background: rgba(7,20,38,0.8); padding: 20px; border-radius: 20px; margin: 20px 0;">
              <p style="color: var(--blue-sky); font-weight: 600; margin-bottom: 16px;">⬇️ KONFIRMASI SEKARANG ⬇️</p>
              <div style="display: flex; gap: 12px; justify-content: center;">
                <a href="${CONFIG.SUPPORT.TELEGRAM_LINK}" target="_blank" class="support-btn telegram" style="padding: 14px 24px;">
                  <i class="fab fa-telegram-plane"></i> ${CONFIG.SUPPORT.TELEGRAM}
                </a>
                <a href="${CONFIG.SUPPORT.WHATSAPP_LINK}" target="_blank" class="support-btn whatsapp" style="padding: 14px 24px;">
                  <i class="fab fa-whatsapp"></i> ${CONFIG.SUPPORT.WHATSAPP}
                </a>
              </div>
            </div>
          </div>
        `;
        
        showToast('🎉 Pembayaran berhasil!', true);
      }
    } catch (error) {
      console.error('Check status error:', error);
    }
  }, CONFIG.CHECK_INTERVAL);
}

// ============= EVENT LISTENERS =============

/**
 * Format Rupiah saat input
 */
if (elements.amount) {
  elements.amount.addEventListener('input', function(e) {
    let value = this.value.replace(/[^0-9]/g, '');
    
    // Remove leading zeros
    while (value.length > 1 && value.startsWith('0')) {
      value = value.substring(1);
    }
    
    if (value) {
      const angka = parseInt(value);
      this.value = new Intl.NumberFormat('id-ID').format(angka);
    } else {
      this.value = '';
    }
  });
}

/**
 * Quick amount chips
 */
elements.chipButtons.forEach(chip => {
  chip.addEventListener('click', function() {
    const amount = this.dataset.amount;
    elements.amount.value = new Intl.NumberFormat('id-ID').format(amount);
  });
});

/**
 * Generate QRIS button
 */
if (elements.generateQrisBtn) {
  elements.generateQrisBtn.addEventListener('click', function() {
    const rawValue = parseRupiah(elements.amount.value);
    
    if (!rawValue) {
      showToast('Masukkan nominal terlebih dahulu!', false);
      return;
    }
    
    generateQRIS(rawValue);
  });
}

/**
 * Check payment button
 */
if (elements.checkPaymentBtn) {
  elements.checkPaymentBtn.addEventListener('click', async function() {
    if (!currentPayment.orderId || !currentPayment.amount) {
      showToast('Tidak ada pembayaran aktif', false);
      return;
    }
    
    try {
      showToast('⏳ Mengecek status pembayaran...', true);
      
      const response = await fetch(
        `${CONFIG.API_BASE}/api/check-status?orderId=${encodeURIComponent(currentPayment.orderId)}&amount=${currentPayment.amount}`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server mengembalikan format tidak valid');
      }
      
      const result = await response.json();
      
      if (result.success && result.paid) {
        showModal();
        showToast('✅ Pembayaran sudah diterima!', true);
      } else {
        showToast('⏳ Pembayaran belum diterima', false);
      }
    } catch (error) {
      console.error('Check status error:', error);
      showToast('❌ Gagal cek status', false);
    }
  });
}

/**
 * Copy number manual payment
 */
elements.copyNumberBtns.forEach(btn => {
  btn.addEventListener('click', async function() {
    const number = this.dataset.number;
    try {
      await navigator.clipboard.writeText(number);
      showToast('📋 Nomor berhasil disalin!');
    } catch (err) {
      console.error('Copy failed:', err);
      showToast('❌ Gagal menyalin', false);
    }
  });
});

/**
 * Copy Order ID
 */
if (elements.copyOrderBtn) {
  elements.copyOrderBtn.addEventListener('click', async function() {
    const orderId = elements.orderIdSpan.textContent;
    if (orderId && orderId !== '-') {
      try {
        await navigator.clipboard.writeText(orderId);
        showToast('📋 Order ID disalin!');
      } catch (err) {
        console.error('Copy failed:', err);
        showToast('❌ Gagal menyalin', false);
      }
    }
  });
}

/**
 * Method tabs
 */
elements.methodTabs.forEach(tab => {
  tab.addEventListener('click', function() {
    const method = this.dataset.method;
    
    // Update active tab
    elements.methodTabs.forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    
    // Show active section
    elements.methodSections.forEach(section => section.classList.remove('active'));
    const targetSection = document.getElementById(`${method}-section`);
    if (targetSection) {
      targetSection.classList.add('active');
    }
    
    // Reset QRIS section if switching to manual
    if (method === 'manual') {
      resetQRISDisplay();
    }
  });
});

/**
 * Modal close events
 */
if (elements.modalClose) {
  elements.modalClose.addEventListener('click', hideModal);
}

if (elements.modalCloseBtn) {
  elements.modalCloseBtn.addEventListener('click', hideModal);
}

window.addEventListener('click', function(e) {
  if (e.target === elements.modal) {
    hideModal();
  }
});

/**
 * Prevent form submit
 */
document.addEventListener('submit', (e) => e.preventDefault());

/**
 * Initialize
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('=========================================');
  console.log('🚀 PAYMENT GATEWAY READY!');
  console.log('=========================================');
  console.log('💰 Nominal BEBAS:', formatRupiah(CONFIG.MIN_AMOUNT), '-', formatRupiah(CONFIG.MAX_AMOUNT));
  console.log('📱 DANA/GoPay:', CONFIG.MANUAL_PAYMENT.DANA);
  console.log('📞 Support:', CONFIG.SUPPORT.TELEGRAM, CONFIG.SUPPORT.WHATSAPP);
  console.log('=========================================');
  
  // Set default amount ke 10.000
  if (elements.amount) {
    elements.amount.value = new Intl.NumberFormat('id-ID').format(10000);
  }
  
  // Reset state
  resetQRISDisplay();
});