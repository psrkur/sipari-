import React, { useState } from 'react';

export default function SetupWizard() {
  const [dbType, setDbType] = useState('sqlite');
  const [dbPath, setDbPath] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    window.electronAPI.saveConfig({
      dbType,
      dbPath,
      adminEmail,
      adminPassword
    });
    alert('Kurulum tamamlandı! Uygulama yeniden başlatılacak.');
    window.location.reload();
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: 'auto', marginTop: 100 }}>
      <h2>Kurulum Sihirbazı</h2>
      <label>Veritabanı Türü:</label>
      <select value={dbType} onChange={e => setDbType(e.target.value)}>
        <option value="sqlite">SQLite (tek dosya)</option>
        <option value="postgresql">PostgreSQL</option>
      </select>
      {dbType === 'sqlite' ? (
        <>
          <label>Veritabanı Dosya Yolu:</label>
          <input value={dbPath} onChange={e => setDbPath(e.target.value)} required />
        </>
      ) : (
        <>
          <label>PostgreSQL Connection String:</label>
          <input value={dbPath} onChange={e => setDbPath(e.target.value)} required />
        </>
      )}
      <label>Admin E-posta:</label>
      <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
      <label>Admin Şifre:</label>
      <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />
      <button type="submit">Kurulumu Tamamla</button>
    </form>
  );
} 