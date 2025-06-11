 import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ValfsanLogo from './assets/valfsan-logo-png.png';
import './style.css';
import * as XLSX from 'xlsx';
import LoginScreen from './LoginScreen';

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
  const [aktifArac, setAktifArac] = useState(null);
  const [showRedOverlay, setShowRedOverlay] = useState(false);
  const [showGreenOverlay, setShowGreenOverlay] = useState(false);
  const inputAracRef = useRef();
  const inputKutuRef = useRef();
  const inputdeletebarkod = useRef();

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
    if (kutuBarkod.length > 3) {
      const timer = setTimeout(() => {
        handleKutuSubmit(kutuBarkod.trim());
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

    const extractedAracID = aracBarkod.split('-')[0];
    const mevcutDoluluk = eslesmeler.filter(e => e.aracID === extractedAracID).length;
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

    if (mevcutDoluluk >= 20) {
      setMessage(`🚫 ${extractedAracID} aracı dolu! Daha fazla kutu atanamaz.`);
      return;
    }
  };

  useEffect(() => {
    const rafRegex = /^ARAC\d{3}-R\d{1,2}$/;
    if (aracBarkod && !rafRegex.test(aracBarkod)) {
      playErrorSound();
      setMessage("🚫 Hatalı Araç Raf Bilgisi");
      setShowRedOverlay(true);
      setTimeout(() => setShowRedOverlay(false), 2000);
      setAracBarkod('');
    }
  }, [aracBarkod]);

  const handleKutuSubmit = async (kod) => {
    if (!aracBarkod || !kod) return;

    const rafRegex = /^ARAC\d{3}-R\d{1,2}$/;
    if (rafRegex.test(kod)) {
      playErrorSound();
      setMessage("📛 Raf barkodu tekrar okutuldu. Lütfen kutu barkodu okutun.");
      setShowRedOverlay(true);
      setTimeout(() => setShowRedOverlay(false), 2000);
      setKutuBarkod('');
      inputKutuRef.current?.focus();
      return;
    }

    const extractedAracID = aracBarkod.split('-')[0];
    const mevcutDoluluk = eslesmeler.filter(e => e.aracID === extractedAracID).length;
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
            onClick={() => setLoggedInSicilNo(null)}
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
                            <li key={i}>
                              📝 Açıklama: {kutu.stext || '—'}<br />
                              📄 İş Emri: {kutu.prdorder} <br />
                              ⚙️ Malzeme: {kutu.malzeme}<br />
                              🛒 Adet: {kutu.quantity}<br />
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
            <h2>🚚 Araç Deposu İçi</h2>
            <div style={{ marginBottom: '10px' }}>
              <button onClick={handleExcelExport} style={{ marginRight: '10px' }}>📥 Excel İndir</button>
            </div>
            <div style={{ marginBottom: '20px', marginTop: '10px' }}>
              <input
                value={aramaMalzeme}
                onChange={(e) => setAramaMalzeme(e.target.value)}
                placeholder="Malzeme/İş Emri ara..."
                style={{ padding: '8px', width: '200px' }}
              />
              <button onClick={handleArama} style={{ padding: '8px 12px', marginLeft: '5px' }}>Ara</button>
            </div>

            {aramaSonucu.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3>🔍 Arama Sonuçları ({aramaSonucu.length})</h3>
                <ul>
                  {aramaSonucu.map((kutu, i) => (
                    <li key={i} style={{ marginBottom: '10px' }}>
                      ✅ Onay No: {kutu.confirmation || '—'}<br />
                      📝 Açıklama: {kutu.stext || '—'}<br />
                      🔢 İş Emri No: {kutu.prdorder}<br />
                      🧱 Malzeme No: {kutu.malzeme}<br />
                      🛒 Adet: {kutu.quantity}<br />
                      🚚 Araç No/Raf: {kutu.rafID}<br />
                    </li>
                  ))}
                </ul>
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
