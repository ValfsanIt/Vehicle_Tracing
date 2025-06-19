 import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const KutuTransferi = ({
  BACKEND_URL,
  loggedInSicilNo,
  playSuccessSound,
  playErrorSound,
  fetchKutular,
  setMessage,
  setShowGreenOverlay,
  setShowRedOverlay,
  eslesmeler
}) => {
  const [kaynakRaf, setKaynakRaf] = useState('');
  const [kutuBarkod, setKutuBarkod] = useState('');
  const [hedefRaf, setHedefRaf] = useState('');
  const [infoMessage, setInfoMessage] = useState('📦 Kutu bir raftan başka bir rafa taşınacak.');

  const kaynakRafRef = useRef();
  const kutuBarkodRef = useRef();
  const hedefRafRef = useRef();

  const rafRegex = /^ARAC\d{3}-R\d{1,2}$/i;
  const kutuRegex = /^\w+\$\w+\$\d+\$\w+\$\w+$/;

  useEffect(() => {
    kaynakRafRef.current?.focus();
  }, []);

  const playError = (mesaj) => {
    setInfoMessage(mesaj);
    setShowRedOverlay(true);
    playErrorSound();
    setTimeout(() => setShowRedOverlay(false), 2000);
  };

  const handleTransfer = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/barkod-ekle`, {
        aracID: "TRANSFER",
        kutuID: kutuBarkod,
      });

      const parcalar = kutuBarkod.split('$');
      const PRDORDER = parcalar[0] || null;
      const MATERIAL = parcalar[1] || null;
      const QUANTITY = parseInt(parcalar[2]) || 1;
      const CONFIRMATION = parcalar[3] || null;

      const response = await axios.post(`${BACKEND_URL}/api/barkod-ekle`, {
        aracID: hedefRaf.toUpperCase(),
        kutuID: kutuBarkod,
        PRDORDER,
        MATERIAL,
        QUANTITY,
        CONFIRMATION,
        SICILNO: loggedInSicilNo,
      });

      if (response.data.success) {
        playSuccessSound();
        setShowGreenOverlay(true);
        setTimeout(() => setShowGreenOverlay(false), 1000);

        setInfoMessage(`✅ ${MATERIAL} (${QUANTITY} adet) → ${hedefRaf} rafına taşındı`);
        setKaynakRaf('');
        setKutuBarkod('');
        setHedefRaf('');
        fetchKutular();
        kaynakRafRef.current?.focus();
      } else {
        playError(`⚠️ ${response.data.message}`);
      }
    } catch (err) {
      console.error('❌ Transfer hatası:', err);
      playError("❌ Sunucu hatası");
    }
  };

  useEffect(() => {
    if (kaynakRaf.length > 3) {
      const raf = kaynakRaf.trim().toUpperCase();
      if (!rafRegex.test(raf)) {
        playError("🚫 Kaynak raf barkodu hatalı!");
        setKaynakRaf('');
        kaynakRafRef.current?.focus();
        return;
      }
      setKaynakRaf(raf);
      kutuBarkodRef.current?.focus();
    }
  }, [kaynakRaf]);

  useEffect(() => {
    if (kutuBarkod.length > 3 && eslesmeler.length > 0) {
      const kod = kutuBarkod.trim();
      if (!kutuRegex.test(kod)) {
        playError("🚫 Kutu barkodu hatalı!");
        setKutuBarkod('');
        kutuBarkodRef.current?.focus();
        return;
      }

      const kaynaktaVarMi = eslesmeler.some(
        e => e.rafID === kaynakRaf && e.kutuID === kod
      );

      if (!kaynaktaVarMi) {
        playError(`🚫 Bu kutu ${kaynakRaf} rafında bulunmuyor!`);
        setKutuBarkod('');
        kutuBarkodRef.current?.focus();
        return;
      }

      setKutuBarkod(kod);
      hedefRafRef.current?.focus();
    }
  }, [kutuBarkod, eslesmeler]);

  useEffect(() => {
    if (hedefRaf.length > 3 && eslesmeler.length > 0) {
      const raf = hedefRaf.trim().toUpperCase();
      if (!rafRegex.test(raf)) {
        playError("🚫 Hedef raf barkodu hatalı!");
        setHedefRaf('');
        hedefRafRef.current?.focus();
        return;
      }

      const hedefteVarMi = eslesmeler.some(
        e => e.rafID === raf && e.kutuID?.trim() !== ''
      );

      if (hedefteVarMi) {
        playError(`🚫 ${raf} rafı zaten dolu! Transfer iptal edildi.`);
        setHedefRaf('');
        hedefRafRef.current?.focus();
        return;
      }

      setHedefRaf(raf);
      handleTransfer();
    }
  }, [hedefRaf, eslesmeler]);

  return (
    <div>
      <h3>🔁 Kutu Transferi</h3>
      <p>{infoMessage}</p>

      <input
        ref={kaynakRafRef}
        value={kaynakRaf}
        onChange={(e) => setKaynakRaf(e.target.value)}
        placeholder="Kaynak Raf (örn: ARAC001-R1)"
      />
      <input
        ref={kutuBarkodRef}
        value={kutuBarkod}
        onChange={(e) => setKutuBarkod(e.target.value)}
        placeholder="Kutu Barkodu"
      />
      <input
        ref={hedefRafRef}
        value={hedefRaf}
        onChange={(e) => setHedefRaf(e.target.value)}
        placeholder="Hedef Raf (örn: ARAC002-R4)"
      />
    </div>
  );
};

export default KutuTransferi;