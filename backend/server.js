
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

console.log("🟢 Bu çalışan server.js dosyan!");

const app = express();
app.use(cors());
app.use(express.json());

    
app.listen(5000, '0.0.0.0', () => {
  console.log("Sunucu çalışıyor...");
});

  
const config = {
  user: 'mert',
  password: 'Yaman123.',
  server: '172.30.134.15',
  database: 'VALFSAN604',
  options: {
    encrypt: false,
    trustServerCertificate: false
  }
};

app.post('/api/barkod-ekle', async (req, res) => {
  const { aracID, kutuID } = req.body;
  const parcalar = kutuID.split('$');
  const prdorder = parcalar[0] || null;
  const material = parcalar[1] || null;
  const QUANTITY = parseInt(parcalar[2]) || 1;
  const CONFIRMATION = parcalar[3] || null;
  const stResponse = await sql.query`
  SELECT STEXT FROM IASPRDOPR WHERE CONFIRMATION = ${CONFIRMATION}`;
  const STEXT = stResponse.recordset[0]?.STEXT?.trim() || '-';
  const SICILNO = req.body.SICILNO || null;
   
 
   if (!aracID || !kutuID) {
    return res.status(400).json({ success: false, message: "AracID veya KutuID eksik." });
  }

  try {
    const pool = await sql.connect(config);

     const result = await pool.request()
  .input('ARACID', sql.VarChar, aracID)
  .input('KUTUID', sql.VarChar, kutuID)
  .input('PRDORDER', sql.VarChar, prdorder)
  .input('MATERIAL', sql.VarChar, material)
  .input('CONFIRMATION', sql.VarChar, CONFIRMATION)
  .input('QUANTITY', sql.Int, QUANTITY)
  .input('SICILNO', sql.VarChar, SICILNO)  
  .input('STEXT', sql.VarChar, STEXT)



  .query(`
    IF @ARACID = 'ÜRETİM SAHASI'
      DELETE FROM KutuTakipLog WHERE KUTUID = @KUTUID;
    ELSE IF EXISTS (SELECT 1 FROM KutuTakipLog WHERE KUTUID = @KUTUID AND ARACID = @ARACID)
      SELECT 'ZATEN_EKLENDI' AS durum;
    ELSE IF EXISTS (SELECT 1 FROM KutuTakipLog WHERE KUTUID = @KUTUID)
      UPDATE KutuTakipLog 
      SET ARACID = @ARACID, CREATEDAT = GETDATE(), MATERIAL = @MATERIAL, PRDORDER = @PRDORDER, CONFIRMATION  = @CONFIRMATION,  QUANTITY = @QUANTITY, SICILNO = @SICILNO
      WHERE KUTUID = @KUTUID;
    ELSE IF EXISTS (SELECT 1 FROM KutuTakipLog WHERE ARACID = @ARACID)
      SELECT 'RAF_DOLU' AS durum;
    ELSE
      INSERT INTO KutuTakipLog (ARACID, KUTUID, CREATEDAT, MATERIAL, PRDORDER, CONFIRMATION, QUANTITY, STEXT, SICILNO) 
      VALUES (@ARACID, @KUTUID, GETDATE(), @MATERIAL, @PRDORDER, @CONFIRMATION, @QUANTITY, @STEXT, @SICILNO);
`)

    if (result?.recordset?.[0]?.durum === 'ZATEN_EKLENDI') {
      return res.json({ success: false, message: 'Bu kutu zaten bu araca atanmış.' });
    }

    if (result?.recordset?.[0]?.durum === 'RAF_DOLU') {
      return res.json({ success: false, message: 'RAF ZATEN DOLU!' });
    }
    res.json({ success: true, message: '✅ Kutu başarıyla işlendi.' });

  } catch (err) {
    console.error("❌ SQL HATASI:", err.message);
    res.status(500).json({
      success: false,
      error: 'Veri kaydedilemedi.',
      detail: err.message
    });
  }
});

app.get('/api/kutu-durumlari', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`SELECT ARACID, KUTUID, CREATEDAT, MATERIAL, PRDORDER, CONFIRMATION, QUANTITY FROM KutuTakipLog`);
    res.json(result.recordset);
      
  } catch (err) {
    console.error("❌ GET kutu-durumlari hatası:", err.message);
    res.status(500).json({ success: false, error: 'Kutu verileri alınamadı.' });
  }
});
app.get('/api/stext/:confirmation', async (req, res) => {
  const confirmation = req.params.confirmation;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('CONFIRMATION', sql.VarChar, confirmation)
      .query('SELECT STEXT FROM IASPRDOPR WHERE CONFIRMATION = @CONFIRMATION');

    if (result.recordset.length > 0) {
      res.json({ stext: result.recordset[0].STEXT });
    } else {
      res.json({ stext: '-' });
    }
  } catch (err) {
    console.error('❌ STEXT çekme hatası:', err.message);
    res.status(500).json({ error: 'STEXT alınamadı' });
  }
});

 app.get('/api/kisi/:sicilNo', async (req, res) => {
  const sicilNo = req.params.sicilNo;
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('SICILNO', sql.VarChar, sicilNo)
      .query('SELECT DISPLAY FROM IASHCMPER WHERE PERSID = @SICILNO AND EMPLTYPE = 0');
    
    if (result.recordset.length > 0) {
      res.json({ display: result.recordset[0].DISPLAY });  // display döndürülüyor
    } else {
      res.json({ display: '-' });
    }
  } catch (err) {
    console.error('❌ İsim verisi alınamadı:', err.message);
    res.status(500).json({ error: 'İsim alınamadı' });
  }
});


app.listen(5000, () => {
  console.log('🟢 Sunucu 5000 portunda çalışıyor...');
});
