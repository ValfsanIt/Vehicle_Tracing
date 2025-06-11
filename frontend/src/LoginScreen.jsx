 import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL;

function LoginScreen({ onLoginSuccess }) {
  const [sicilNo, setSicilNo] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);  // 📌 referans tanımladık

  // 🟡 Sayfa ilk yüklendiğinde input'a odaklan
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
useEffect(() => {
  if (sicilNo.includes('$')) {
    handleLogin();
  }
}, [sicilNo]);

  const handleLogin = async () => {
  if (!sicilNo) {
    setError("❌ Lütfen Sicil Numaranızı Girin.");
    inputRef.current?.focus();
    return;
  }

  try {
    const parsedSicilNo = sicilNo.split('$')[0]; // sadece ilk kısmı al
    const response = await axios.get(`${BACKEND_URL}/api/kisi/${parsedSicilNo}`);
    
    if (response.data.display && response.data.display !== '-') {
      onLoginSuccess(parsedSicilNo);  // doğru olanı gönder
      setError('');
    } else {
      setError("❌ Girdiğiniz Sicil Numarası sistemde bulunamadı.");
      setSicilNo('');
      inputRef.current?.focus();
    }
  } catch (err) {
    console.error('❌ Giriş Hatası:', err);
    setError("❌ Sunucuya bağlanılamadı.");
    setSicilNo('');
    inputRef.current?.focus();
  }
};
  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h2>🔒 <b>Lütfen Sicil Numaranızı Girin</b></h2>
      <input
        ref={inputRef} // 🎯 focus için referans verdik
        type="text"
        value={sicilNo}
        onChange={(e) => setSicilNo(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        placeholder="Sicil Numaranız"
        style={{
          padding: '10px',
          width: '200px',
          fontSize: '16px',
          borderRadius: '5px',
          border: '1px solid #ccc',
          marginTop: '10px'
        }}
      />
      <br />
      <button
        onClick={handleLogin}
        style={{
          marginTop: '10px',
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Giriş
      </button>
      {error && (
        <p style={{ color: 'red', marginTop: '15px', fontWeight: 'bold' }}>{error}</p>
      )}
    </div>
  );
}

export default LoginScreen;
