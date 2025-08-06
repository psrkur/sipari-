const nodemailer = require('nodemailer');

// Email transporter oluştur
const createTransporter = () => {
  console.log('🔧 Email transporter oluşturuluyor...');
  console.log('📧 Nodemailer version:', nodemailer.version);
  
  // Email ayarları kontrol et
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email ayarları yapılandırılmamış. EMAIL_USER ve EMAIL_PASS environment variables gerekli.');
  }

  console.log('✅ Email ayarları mevcut');
  console.log('👤 EMAIL_USER:', process.env.EMAIL_USER ? 'Ayarlanmış' : 'Eksik');
  console.log('🔑 EMAIL_PASS:', process.env.EMAIL_PASS ? 'Ayarlanmış' : 'Eksik');

  // Gmail SMTP ayarları
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Timeout ayarları
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000
  });

  console.log('✅ Transporter oluşturuldu');
  return transporter;
};

// Sipariş email template'i
const createOrderEmailTemplate = (order, customer, branch) => {
  const itemsList = order.orderItems?.map(item => 
    `• ${item.product?.name || 'Ürün'} - ${item.quantity} adet - ₺${item.price.toFixed(2)}`
  ).join('\n') || 'Ürün detayları yüklenemedi';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #28a745; margin: 0;">🍕 Yeni Sipariş Alındı!</h1>
        <p style="margin: 10px 0 0 0; color: #6c757d;">Siparişiniz başarıyla oluşturuldu.</p>
      </div>
      
      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">Sipariş Detayları</h2>
        
        <div style="margin-bottom: 20px;">
          <strong>Sipariş Numarası:</strong> ${order.orderNumber}<br>
          <strong>Şube:</strong> ${branch?.name || 'Belirtilmemiş'}<br>
          <strong>Tarih:</strong> ${new Date(order.createdAt).toLocaleString('tr-TR')}<br>
          <strong>Toplam Tutar:</strong> ₺${order.totalAmount.toFixed(2)}
        </div>
        
        ${customer ? `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #e9ecef; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #495057;">Müşteri Bilgileri</h3>
          <strong>Ad:</strong> ${customer.name}<br>
          <strong>Telefon:</strong> ${customer.phone}<br>
          ${customer.email ? `<strong>Email:</strong> ${customer.email}<br>` : ''}
          ${customer.address ? `<strong>Adres:</strong> ${customer.address}` : ''}
        </div>
        ` : ''}
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #495057;">Sipariş Öğeleri</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
            <pre style="margin: 0; white-space: pre-wrap; font-family: inherit;">${itemsList}</pre>
          </div>
        </div>
        
        ${order.notes ? `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #856404;">Sipariş Notu</h3>
          <p style="margin: 0;">${order.notes}</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; margin: 0;">Bu email otomatik olarak gönderilmiştir.</p>
          <p style="color: #6c757d; margin: 5px 0 0 0;">Sipariş durumunuzu takip etmek için sistemimizi kullanabilirsiniz.</p>
        </div>
      </div>
    </div>
  `;
};

// Email gönderme fonksiyonu
const sendOrderNotification = async (order, customer, branch) => {
  try {
    const transporter = createTransporter();
    
    // Email template'ini oluştur
    const emailHtml = createOrderEmailTemplate(order, customer, branch);
    
    // Email gönder
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customer?.email || process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `🍕 Yeni Sipariş: ${order.orderNumber} - ${branch?.name || 'Şube'}`,
      html: emailHtml,
      text: `
        Yeni Sipariş Alındı!
        
        Sipariş Numarası: ${order.orderNumber}
        Şube: ${branch?.name || 'Belirtilmemiş'}
        Tarih: ${new Date(order.createdAt).toLocaleString('tr-TR')}
        Toplam Tutar: ₺${order.totalAmount.toFixed(2)}
        
        Müşteri: ${customer?.name || 'Belirtilmemiş'}
        Telefon: ${customer?.phone || 'Belirtilmemiş'}
        
        Sipariş detayları için web sitesini ziyaret edin.
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email başarıyla gönderildi:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Email gönderme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Admin email bildirimi
const sendAdminNotification = async (order, customer, branch) => {
  try {
    const transporter = createTransporter();
    
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dc3545; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0;">🚨 Yeni Sipariş Bildirimi</h1>
          <p style="margin: 10px 0 0 0;">Yeni bir sipariş alındı ve işleme alınması gerekiyor.</p>
        </div>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Sipariş Özeti</h2>
          
          <div style="margin-bottom: 20px;">
            <strong>Sipariş Numarası:</strong> ${order.orderNumber}<br>
            <strong>Şube:</strong> ${branch?.name || 'Belirtilmemiş'}<br>
            <strong>Sipariş Tipi:</strong> ${order.orderType === 'TABLE' ? 'Masa Siparişi' : 'Teslimat Siparişi'}<br>
            <strong>Tarih:</strong> ${new Date(order.createdAt).toLocaleString('tr-TR')}<br>
            <strong>Toplam Tutar:</strong> ₺${order.totalAmount.toFixed(2)}
          </div>
          
          ${customer ? `
          <div style="margin-bottom: 20px; padding: 15px; background-color: #e9ecef; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #495057;">Müşteri Bilgileri</h3>
            <strong>Ad:</strong> ${customer.name}<br>
            <strong>Telefon:</strong> ${customer.phone}<br>
            ${customer.email ? `<strong>Email:</strong> ${customer.email}<br>` : ''}
            ${customer.address ? `<strong>Adres:</strong> ${customer.address}` : ''}
          </div>
          ` : ''}
          
          ${order.notes ? `
          <div style="margin-bottom: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #856404;">Sipariş Notu</h3>
            <p style="margin: 0;">${order.notes}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin'}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Admin Paneline Git
            </a>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `🚨 Yeni Sipariş: ${order.orderNumber} - ${branch?.name || 'Şube'}`,
      html: adminEmailHtml
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Admin email bildirimi gönderildi:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Admin email gönderme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Şifre sıfırlama email template'i
const createPasswordResetEmailTemplate = (resetLink, userName) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="margin: 0;">🔐 Şifre Sıfırlama</h1>
        <p style="margin: 10px 0 0 0;">Şifrenizi sıfırlamak için aşağıdaki linke tıklayın.</p>
      </div>
      
      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">Merhaba ${userName},</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Hesabınız için şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Şifremi Sıfırla
          </a>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">
            <strong>Önemli:</strong> Bu link 1 saat süreyle geçerlidir. Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; margin: 0;">Bu email otomatik olarak gönderilmiştir.</p>
          <p style="color: #6c757d; margin: 5px 0 0 0;">Sorularınız için destek ekibimizle iletişime geçebilirsiniz.</p>
        </div>
      </div>
    </div>
  `;
};

// Şifre sıfırlama emaili gönderme
const sendPasswordResetEmail = async (email, resetLink, userName) => {
  try {
    const transporter = createTransporter();
    
    const emailHtml = createPasswordResetEmailTemplate(resetLink, userName);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🔐 Şifre Sıfırlama Talebi - Yemek5',
      html: emailHtml,
      text: `
        Şifre Sıfırlama Talebi
        
        Merhaba ${userName},
        
        Hesabınız için şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:
        
        ${resetLink}
        
        Bu link 1 saat süreyle geçerlidir. Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.
        
        Yemek5 Ekibi
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Şifre sıfırlama emaili gönderildi:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Şifre sıfırlama email gönderme hatası:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOrderNotification,
  sendAdminNotification,
  sendPasswordResetEmail
}; 