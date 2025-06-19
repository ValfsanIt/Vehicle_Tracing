    import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ValfsanLogo from './assets/valfsan-logo-png.png';
import './style.css';
import * as XLSX from 'xlsx';
import LoginScreen from './LoginScreen';
import KutuTransferi from "./Transfer";




const BACKEND_URL = import.meta.env.VITE_API_URL;

function App() { 
  const playSuccessSound = () => {
    const audio = new Audio('/sounds/success.wav');
    audio.play().catch(err => console.error('🔇 Başarı sesi çalınamadı:', err));
  };

  const playErrorSound = () => {
    const audio = new Audio('/sounds/error.wav');
    audio.play().catch(err => console.error('🔇 Hata sesi çalınamadı:', err));
  };

  const [araclar] = useState(Array.from({ length: 20 }, (_, i) => ({
    aracID: `ARAC${(i + 1).toString().padStart(3, '0')}`
  })));

  const [aracBarkod, setAracBarkod] = useState('');
  const [kutuBarkod, setKutuBarkod] = useState('');
  const [uretimKutuBarkod, setUretimKutuBarkod] = useState('');
  const [eslesmeler, setEslesmeler] = useState([]);
  const [message, setMessage] = useState('Lütfen barkodları okutun');
  const [view, setView] = useState('giris');
  const [seciliArac, setSeciliArac] = useState(null);
  const [aramaMalzeme, setAramaMalzeme] = useState('');
  const [aramaSonucu, setAramaSonucu] = useState([]);
  const [gecmisArama, setGecmisArama] = useState('');
  const [gecmisSonuclar, setGecmisSonuclar] = useState([]);
  const [aktifArac, setAktifArac] = useState(null);
  const [showRedOverlay, setShowRedOverlay] = useState(false);
  const [showGreenOverlay, setShowGreenOverlay] = useState(false);
  const inputAracRef = useRef();
  const inputKutuRef = useRef();
  const inputdeletebarkod = useRef();
  const [kutuGecmisi, setKutuGecmisi] = useState([]);
  const [secilenKutu, setSecilenKutu] = useState(null);
  
  
  


  const handleKutuClick = async (kutu) => {
  setSecilenKutu(kutu);
  try {
    const res = await axios.get(`${BACKEND_URL}/api/kutu-gecmis/${kutu.kutuID}`);
    setKutuGecmisi(res.data);
  } catch (err) {
    console.error("❌ Geçmiş alınamadı:", err);
    setKutuGecmisi([]);
  }
};



  const fetchKutular = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/kutu-durumlari`);
      const kutular = response.data
        .filter(k => k.ARACID && k.KUTUID && k.KUTUID.trim() !== '')
        .map(k => {
          const parcalar = k.KUTUID.split('$');
          const prdorder = parcalar[0] || '-';
          const malzeme = parcalar[1] || '-';
          const rafID = k.ARACID.includes('-R') ? k.ARACID : null;
          return {
            aracID: k.ARACID.split('-')[0],
            rafID: rafID || '',
            kutuID: k.KUTUID,
            malzeme,
            prdorder: k.PRDORDER || '',
            confirmation: k.CONFIRMATION || '-',
            quantity: k.QUANTITY || '-',
            SICILNO: loggedInSicilNo,
            CREATEDAT: k.CREATEDAT || '-',
            FULLNAME: k.FULLNAME || '-',

          };
        });
      
      const enrichedKutular = await Promise.all(kutular.map(async (kutu) => {
        if (kutu.confirmation && kutu.confirmation !== '-') {
          try {
            const stResponse = await axios.get(`${BACKEND_URL}/api/stext/${kutu.confirmation}`);
            return { ...kutu, stext: stResponse.data.stext || '-' };
          } catch (err) {
            return { ...kutu, stext: '-' };
          }
        } else {
          return { ...kutu, stext: '-' };
        }
      }));
      setEslesmeler(enrichedKutular);
    } catch (err) {
      console.error("❌ Veri çekilemedi:", err);
    }
  };

  useEffect(() => { fetchKutular(); }, []);

  useEffect(() => {
    if (view === 'giris') {
      inputAracRef.current?.focus();
    }
    if (view === 'silme') {
      inputdeletebarkod.current?.focus();
    }
  }, [view]);

  useEffect(() => {
    if (aracBarkod.length > 3 && aracBarkod.includes('-R')) {
      inputKutuRef.current?.focus();
    }
  }, [aracBarkod]);
   useEffect(() => {
  const kutuRegex = /^\w+\$\w+\$\d+\$\w+\$\w+$/; // ✅ Kutu barkodu formatı

  if (aracBarkod && kutuRegex.test(aracBarkod)) {
    playErrorSound();
    setMessage("❌ Bu alana KUTU barkodu okutulamaz! Lütfen araç raf barkodu okutun.");
    setShowRedOverlay(true);
    setTimeout(() => {
      setShowRedOverlay(false);
      setAracBarkod('');
      inputAracRef.current?.focus();
    }, 2000);
  }
}, [aracBarkod]);

   useEffect(() => {
  if (kutuBarkod.length > 3) {
    const timer = setTimeout(() => {
      handleKutuSubmitkutu(kutuBarkod.trim()); // doğru isim bu
    }, 500);
    return () => clearTimeout(timer);
  }
}, [kutuBarkod]);


  useEffect(() => {
    if (uretimKutuBarkod.length > 3) {
      const timer = setTimeout(() => {
        handleUretimSubmit(uretimKutuBarkod.trim());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [uretimKutuBarkod]);

  useEffect(() => { if (view === 'depo') fetchKutular(); }, [view]);

  const handleKutuSubmitkutu = async (kod) => {
    if (!aracBarkod || !kod) return;
    
  // 🛑 Araç raf barkodu okutulduysa işlemi durdur
  const rafRegex = /^ARAC\d{3}-R\d{1,2}$/;
  if (rafRegex.test(kod)) {
    playErrorSound();
    setMessage("❌ Bu alana ARAÇ RAF BARKODU OKUTULAMAZ! Lütfen sadece kutu barkodu okutun.");
    setShowRedOverlay(true);
    setTimeout(() => {
      setShowRedOverlay(false);
      setKutuBarkod('');
      inputKutuRef.current?.focus();
    }, 2000);
    return;
  }

    const isValidKutuBarkod = (kod) => {
      const parts = kod.split('$');
      return parts.length === 5 && parts.every(part => part.trim() !== '');
    };

    if (!isValidKutuBarkod(kod)) {
      playErrorSound();
      setMessage("🚫 Geçersiz kutu barkodu formatı!");
      setShowRedOverlay(true);
      setTimeout(() => setShowRedOverlay(false), 2000);
      setKutuBarkod('');
      return;
    }
    const zatenVar = eslesmeler.some(e => e.kutuID === kod);
if (zatenVar) {
  playErrorSound();
  setMessage(`🚫 Bu kutu zaten bir araca atanmış! Lütfen transfer ekranını kullanın.`);
  setShowRedOverlay(true);
  setTimeout(() => setShowRedOverlay(false), 2000);
  setKutuBarkod('');
  return;
}

 const extractedAracID = aracBarkod.split('-')[0];
const mevcutDoluluk = eslesmeler.filter(e => e.aracID === extractedAracID).length;

// RAF KONTROLÜ
const isRafDolu = eslesmeler.some(e => e.rafID === aracBarkod && e.kutuID?.trim() !== '');
if (isRafDolu) {
  playErrorSound();
  setMessage(`❌ ${aracBarkod} rafına zaten kutu atanmış!`);
  setShowRedOverlay(true);
  setTimeout(() => setShowRedOverlay(false), 2000);
  setKutuBarkod('');
  inputAracRef.current?.focus();
  return;
}

// DOLULUK KONTROLÜ
if (mevcutDoluluk >= 20) {
  playErrorSound();
  setMessage(`🚫 ${extractedAracID} aracı dolu! Daha fazla kutu atanamaz.`);
  setShowRedOverlay(true);
  setTimeout(() => setShowRedOverlay(false), 2000);
  setAracBarkod('');
  setKutuBarkod('');
  inputAracRef.current?.focus();
  return;
}


    const parcalar = kod.split('$');
    const PRDORDER = parcalar[0] || null;
    const MATERIAL = parcalar[1] || null;
    const QUANTITY = parseInt(parcalar[2]) || 1;
    const CONFIRMATION = parcalar[3] || null;
    try {
      const response = await axios.post(`${BACKEND_URL}/api/barkod-ekle`, {
        aracID: aracBarkod,
        kutuID: kod,
        PRDORDER,
        MATERIAL,
        QUANTITY,
        CONFIRMATION,
        SICILNO: loggedInSicilNo,
      });

      if (response.data.success) {
        setShowGreenOverlay(true);
        setTimeout(() => setShowGreenOverlay(false), 1000);
        playSuccessSound();
        const tarih = new Date().toLocaleString('tr-TR');
        const malzeme = MATERIAL || kod;
        const yeni = {
          aracID: extractedAracID,
          rafID: aracBarkod,
          kutuID: kod,
          malzeme,
          tarih
        };
        setEslesmeler(prev => [...prev.filter(e => e.kutuID !== kod), yeni]);
        setMessage(`✅ Malzeme: ${MATERIAL} (${QUANTITY} adet) → ${aracBarkod} rafına eklendi`);
        inputAracRef.current?.focus();
        setKutuBarkod('');
        setAracBarkod('');
      } else {
        setMessage(`⚠️ ${response.data.message}`);
        if (response.data.message?.toLowerCase().includes('zaten')) {
          playErrorSound();
          setShowRedOverlay(true);
          setTimeout(() => setShowRedOverlay(false), 2000);
          setAracBarkod('');
          setKutuBarkod('');
          inputAracRef.current?.focus();
        }
      }
    } catch (err) {
      playErrorSound();
      console.error('❌ Hata:', err);
      setMessage('❌ Sunucu hatası oluştu.');
      setShowRedOverlay(true);
      setTimeout(() => setShowRedOverlay(false), 2000);
    }
  };

  const getDoluluk = (aracID) =>
    eslesmeler.filter(e => e.aracID === aracID).length;

  const getDepoClass = (doluluk) => {
    if (doluluk === 20) return 'dolu';
    if (doluluk >= 11) return 'sari';
    if (doluluk >= 1) return 'yesil';
    return '';
  };
const handleGecmisArama = () => {
  const keyword = gecmisArama.trim();
  if (!keyword.includes('$')) return;

  axios.get(`${BACKEND_URL}/api/silinmis-kutu/${keyword}`)
    .then(res => {
      if (res.data.length > 0) {
        setGecmisSonuclar(res.data);
      } else {
        setGecmisSonuclar([]);
      }
    })
    .catch(err => {
      console.error('❌ Silinmiş kutu arama hatası:', err);
      setGecmisSonuclar([]);
    });
};


  const handleArama = () => {
  const keyword = aramaMalzeme.trim().toLowerCase();

  const sonuc = eslesmeler.filter(k =>
    (k.malzeme && k.malzeme.toLowerCase().includes(keyword)) ||
    (k.prdorder && k.prdorder.toLowerCase().includes(keyword)) ||
    (k.confirmation && k.confirmation.toLowerCase().includes(keyword))
  );

  setAramaSonucu(sonuc);
};

  const handleUretimSubmit = async (kod) => {
    if (!kod) return;
    const rafRegex = /^ARAC\d{3}-R\d{1,2}$/;
    if (rafRegex.test(kod)) {
      playErrorSound();
      setMessage("📛 ARAÇ BARKODU OKUTAMAZSINIZ! Lütfen Kutu Barkodu okutun.");
      setShowRedOverlay(true);
      setTimeout(() => setShowRedOverlay(false), 2000);
      setUretimKutuBarkod('');
      return;
    }

    try {
      await axios.post(`${BACKEND_URL}/api/barkod-ekle`, {
        aracID: "ÜRETİM SAHASI",
        kutuID: kod,
        SICILNO: loggedInSicilNo
      });
      setEslesmeler(prev => prev.filter(e => e.kutuID !== kod));
      playSuccessSound();
      setMessage(`📦 ${kod} → Kutu başarıyla silindi`);
      setShowGreenOverlay(true);
      setTimeout(() => setShowGreenOverlay(false), 1000);
      setUretimKutuBarkod('');
    } catch (err) {
      console.error('❌ Üretim kutu silme hatası:', err);
      setMessage('❌ Sunucu hatası oluştu.');
      setShowRedOverlay(true);
      setTimeout(() => setShowRedOverlay(false), 2000);
    }
  };

  const handleExcelExport = () => {
    const wsData = eslesmeler.map(e => {
      const prdorder = e.kutuID.split('$')[0] || e.kutuID;
      return {
        
        "Araç No": e.aracID,
        "Raf": e.rafID.split('-R')[1] || '',
        "İş Emri": prdorder,
        "Onay No": e.confirmation || '',
        Malzeme: e.malzeme,
        Adet: e.quantity || '-',
        "Tarih": e.CREATEDAT,
        "İşlem Yapan": e.FULLNAME || loggedInSicilNo || ''
      };
    });



    const worksheet = XLSX.utils.json_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "KutuDurumlari");
    XLSX.writeFile(workbook, "KutuDurumlari.xlsx");
  };

  const [loggedInSicilNo, setLoggedInSicilNo] = useState(null);
  const [kullaniciAdi, setKullaniciAdi] = useState('');

  useEffect(() => {
  if (loggedInSicilNo) {
    axios.get(`${BACKEND_URL}/api/kisi/${loggedInSicilNo}`)
      .then(res => {
        if (res.data.display && res.data.display !== '-') {
          setKullaniciAdi(res.data.display);  // ✅ doğruysa göster
        } else {
          // ❌ kullanıcı sistemde yoksa oturumu kapat
          setLoggedInSicilNo(null);
        }
      })
      .catch(err => {
        console.error("❌ Kullanıcı adı alınamadı:", err);
        setLoggedInSicilNo(null); // ❌ API hatası varsa da giriş iptal
      });
  }
}, [loggedInSicilNo]);

  useEffect(() => {
    if (loggedInSicilNo && view === 'giris') {
      setTimeout(() => {
        inputAracRef.current?.focus();
      }, 300);
    }
  }, [loggedInSicilNo]);
  useEffect(() => {
  if (!loggedInSicilNo) return;

  let timer;

  const resetTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      setLoggedInSicilNo(null); // ⛔ Oturumu kapat
    }, 30000); // 30 saniye
  };

  const activityEvents = ['mousemove', 'keydown', 'click', 'scroll'];

  activityEvents.forEach(event =>
    window.addEventListener(event, resetTimer)
  );

  resetTimer(); // İlk timer'ı başlat

  return () => {
    clearTimeout(timer);
    activityEvents.forEach(event =>
      window.removeEventListener(event, resetTimer)
    );
  };
}, [loggedInSicilNo]);


  if (!loggedInSicilNo) {
    return <LoginScreen onLoginSuccess={setLoggedInSicilNo} />;
  }

  return (
    <>
      {loggedInSicilNo && (
        <div
          className="giris-bilgisi"
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#f7f7f7',
            padding: '8px 16px',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 'bold',
            zIndex: 999,
          }}
        >
          👤 Giriş yapan: {kullaniciAdi || loggedInSicilNo}
          <button
  onClick={() => {
    setLoggedInSicilNo(null);
    window.location.reload(); // Sayfayı yenile
  }}
  style={{
    background: '#ff4d4f',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  }}
>
  Çıkış Yap
</button>

        </div>
      )}

      {/* 🔴 Hatalı işlem ekranı */}
      {showRedOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(255, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '32px',
            fontWeight: 'bold',
          }}
        >
          ❌ HATALI İŞLEM!
        </div>
      )}

      {/* ✅ Başarılı işlem ekranı */}
      {showGreenOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 200, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '32px',
            fontWeight: 'bold',
          }}
        >
          ✅ BAŞARILI!
        </div>
      )}

      {/* Sayfa Ana İçeriği */}
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
          <button onClick={() => setView('giris')}>📦 Kutu Giriş</button>
          <button onClick={() => setView('depo')}>🚚 Araç Deposu İçi</button>
          <button onClick={() => setView('silme')}>🗑️ Kutu Çıkış</button>
          <button onClick={() => setView('transfer')}>🔁 Kutu Transferi</button>
        </div>

        {aktifArac && (
          <div className="modal-overlay" onClick={() => setAktifArac(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{aktifArac} Rafları</h2>
              <button
                onClick={() => setAktifArac(null)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '20px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                }}
              >
                ✖
              </button>

              <div className="raf-grid">
                {Array.from({ length: 20 }, (_, i) => {
                  const rafKodu = `${aktifArac}-R${i + 1}`;
                  const kutular = eslesmeler.filter(k => k.rafID === rafKodu);
                  const rafClass = kutular.length === 0 ? 'raf-bos' : kutular.length === 1 ? 'raf-yesil' : 'raf-sari';

                  return (
                    <div key={rafKodu} className={`raf-kutu ${rafClass}`}>
                      <h4>{rafKodu}</h4>
                      {kutular.length === 0 ? (
                        <p style={{ color: 'gray' }}>📭 Boş</p>
                      ) : (
                             <ul style={{ paddingLeft: '18px' }}>
  {kutular.map((kutu, i) => (
     <li
  key={i}
  style={{
    background: '#f0f0f0',
    padding: '6px',
    borderRadius: '5px',
    marginBottom: '6px'
  }}
>

      🧍 İşlem Yapan: {kutu.FULLNAME}<br />
      📝 Açıklama: {kutu.stext || '—'}<br />
      📄 İş Emri: {kutu.prdorder} <br />
      ⚙️ Malzeme: {kutu.malzeme}<br />
      🛒 Adet: {kutu.quantity}<br />
       📅 Eklenme: {new Date(new Date(kutu.CREATEDAT).getTime() + (3 * 60 * 60 * 1000)).toLocaleString('tr-TR')
}



    </li>
  ))}
</ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
       {view === 'transfer' && loggedInSicilNo && (
  <KutuTransferi
    BACKEND_URL={BACKEND_URL}  // 💥 EKLENMİŞ HALİ
    loggedInSicilNo={loggedInSicilNo}
    playSuccessSound={playSuccessSound}
    playErrorSound={playErrorSound}
    fetchKutular={fetchKutular}
    setMessage={setMessage}
    setShowGreenOverlay={setShowGreenOverlay}
    setShowRedOverlay={setShowRedOverlay}
    eslesmeler={eslesmeler} 
  />
)}



        {view === 'giris' && (
          <>
            <h1>🚚 Araç Takip Sistemi</h1>
            <img src={ValfsanLogo} alt="logo" width="120" />
            <p>{message}</p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                ref={inputAracRef}
                value={aracBarkod}
                onChange={(e) => setAracBarkod(e.target.value)}
                placeholder="Raf barkodu okutun (ör. ARAC001-R1)"
              />
              <input
                ref={inputKutuRef}
                value={kutuBarkod}
                onChange={(e) => setKutuBarkod(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleKutuSubmit(kutuBarkod.trim())}
                placeholder="Kutu barkodu okutun"
              />
            </div>
          </>
        )}

        {view === 'silme' && (
          <div>
            <h3>🗑️ Kutu Silme Alanı</h3>
            <p>{message}</p>
            <input
              ref={inputdeletebarkod}
              value={uretimKutuBarkod}
              onChange={(e) => setUretimKutuBarkod(e.target.value)}
              placeholder="Silinecek kutu barkodu..."
            />
          </div>
        )}

        {view === 'depo' && (

          
          <>

 {gecmisSonuclar.length > 0 && (
  <div style={{
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: '10px',
    padding: '15px',
    marginBottom: '20px',
    position: 'relative'
  }}>
    <h3 style={{ margin: 0 }}>📜 Silinmiş Kutular</h3>
    <button
      onClick={() => {
        setGecmisSonuclar([]);
        setGecmisArama('');
      }}
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'transparent',
        border: 'none',
        fontSize: '20px',
        cursor: 'pointer'
      }}
      title="Kapat"
    >
      ✖
    </button>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
      {gecmisSonuclar.map((kutu, i) => (
        <div key={i} style={{
          background: '#f0f0f0',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '10px',
          width: '250px',
          fontSize: '13px',
        }}>
          🧍 <strong>{kutu.FULLNAME}</strong><br />
          🧱 <strong>Malzeme:</strong> {kutu.MATERIAL}<br />
          📄 <strong>İş Emri:</strong> {kutu.PRDORDER}<br />
          ✅ <strong>Onay No:</strong> {kutu.CONFIRMATION}<br />
          🛒 <strong>Adet:</strong> {kutu.QUANTITY}<br />
          📅 <strong>Tarih:</strong> {new Date(kutu.CREATEDAT).toLocaleString('tr-TR')}<br />
          🏷 <strong>Kutu ID:</strong> {kutu.KUTUID}
        </div>
      ))}
    </div>
  </div>
)}


            <h2>🚚 Araç Deposu İçi</h2>
            <div style={{ marginBottom: '10px' }}>
              <button onClick={handleExcelExport} style={{ marginRight: '10px' }}>📥 Excel İndir</button>
            </div>
                  <div style={{ marginBottom: '20px', marginTop: '10px' }}>
    </div>
         
  

{secilenKutu && kutuGecmisi.length > 0 && (
  <div style={{
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: '10px',
    padding: '15px',
    marginTop: '10px',
    maxWidth: '500px'
  }}>
    <h4>📦 {secilenKutu.kutuID} Geçmişi</h4>
    <ul style={{ paddingLeft: '20px' }}>
      {kutuGecmisi.map((log, index) => (
        <li key={index}>
          🕓 {new Date(log.CREATEDAT).toLocaleString('tr-TR')} — 🧍 {log.FULLNAME} — 🛠 {log.ISLEM}
        </li>
      ))}
    </ul>
    <button onClick={() => {
      setSecilenKutu(null);
      setKutuGecmisi([]);
      setAramaMalzeme('');
    }} style={{
      marginTop: '10px',
      padding: '6px 10px',
      background: '#ddd',
      borderRadius: '6px',
      cursor: 'pointer'
    }}>
      ❌ Temizle
    </button>
  </div>
)}

  <div style={{ marginBottom: '20px', marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
  <input
    type="text"
    value={aramaMalzeme}
    onChange={(e) => setAramaMalzeme(e.target.value)}
    placeholder="Malzeme/İş Emri/Onay No ara..."
    style={{ padding: '8px', width: '300px' }}
  />
  <button onClick={handleArama} style={{ padding: '8px 12px' }}>Ara</button>

  <input
    type="text"
    value={gecmisArama}
    onChange={(e) => setGecmisArama(e.target.value)}
    placeholder="📦 Geçmiş Kutu Barkodu (örn. PRD123$MAT456$5$...)"
    style={{ padding: '8px', width: '300px' }}
    onKeyDown={(e) => e.key === 'Enter' && handleGecmisArama()}
  />
  <button onClick={handleGecmisArama} style={{ padding: '8px 12px' }}>🔍</button>
</div>


              {aramaSonucu.length > 0 && (
  <div style={{
    marginBottom: '20px',
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: '10px',
    padding: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxHeight: '300px',
    overflowY: 'auto',
    position: 'relative'
  }}>
    <div style={{
      position: 'sticky',
      top: 0,
      background: '#fff',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: '8px',
      borderBottom: '1px solid #eee',
      zIndex: 1
    }}>
      <h3 style={{ margin: 0 }}>
        🔍 Arama Sonuçları ({aramaSonucu.length})
      </h3>
      <button
        onClick={() => {
          setAramaSonucu([]);
          setAramaMalzeme('');
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#111',
          fontWeight: 'bold',
          fontSize: '20px',
          cursor: 'pointer'
        }}
        title="Sonuçları Kapat"
      >
        ✖
      </button>
    </div>

    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      marginTop: '10px'
    }}>
      {aramaSonucu.map((kutu, i) => (
        <div key={i} style={{
          background: '#f9f9f9',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '10px',
          width: '220px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          fontSize: '13px'
        }}>
          🧍 İşlem Yapan: {kutu.FULLNAME}<br />
          ✅ Onay No: {kutu.confirmation || '—'}<br />
          📝 Açıklama: {kutu.stext || '—'}<br />
          🔢 İş Emri: {kutu.prdorder}<br />
          🧱 Malzeme: {kutu.malzeme}<br />
          🛒 Adet: {kutu.quantity}<br />
          🚚 Araç No/Raf: {kutu.rafID}
        </div>
      ))}
    </div>
  </div>
)}
{secilenKutu && (
  <div style={{
    marginTop: '30px',
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: '10px',
    padding: '20px',
    maxWidth: '500px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  }}>
    <h3>📦 Seçilen Kutu: {secilenKutu.kutuID}</h3>
    <p><strong>Malzeme:</strong> {secilenKutu.malzeme}</p>
    <p><strong>İş Emri:</strong> {secilenKutu.prdorder}</p>
    <p><strong>Adet:</strong> {secilenKutu.quantity}</p>

    <h4>📜 İşlem Geçmişi</h4>
    {kutuGecmisi.length === 0 ? (
      <p>🔍 Geçmiş bulunamadı.</p>
    ) : (
      <ul style={{ paddingLeft: '20px' }}>
        {kutuGecmisi.map((log, index) => (
          <li key={index}>
            🕓 {new Date(log.CREATEDAT).toLocaleString('tr-TR')} —
            🧍 {log.FULLNAME} —
            📦 {log.ISDELETE === 1 ? 'Silindi' : 'Transfer Edildi'}
          </li>
        ))}
      </ul>
    )}

    <button onClick={() => setSecilenKutu(null)} style={{
      marginTop: '15px',
      padding: '8px 12px',
      background: '#ff4d4f',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer'
    }}>
      ❌ Kapat
    </button>
  </div>
)}



            <div className="arac-listesi">
              {araclar.map(({ aracID }) => {
                const doluluk = getDoluluk(aracID);
                const isOpen = seciliArac === aracID;
                return (
                  <div key={aracID} style={{ display: 'inline-block' }}>
                    <div
                      className={`depo-gorunum ${getDepoClass(doluluk)}`}
                      onClick={() => {
                        setSeciliArac(isOpen ? null : aracID);
                        setAktifArac(isOpen ? null : aracID);
                      }}
                    >
                      <strong>{aracID}</strong> — {doluluk}/20 kutu yüklü
                      <div className="doluluk-bar-container">
                        <div
                          className="doluluk-bar"
                          style={{
                            width: `${(doluluk / 20) * 100}%`,
                            backgroundColor:
                              doluluk === 20 ? 'red' : doluluk >= 11 ? 'orange' : doluluk >= 1 ? 'green' : '#ccc',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default App;
