const express = require('express');
const multer = require('multer');
const fs = require('fs-extra'); // Usando fs-extra para promessas
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { createSign, createVerify } = require('crypto');
const crypto = require('crypto')
const stream = require('stream');
const pdflibAddPlaceholder = require('@signpdf/placeholder-pdf-lib').pdflibAddPlaceholder;
const signpdf = require('@signpdf/signpdf').default;
const P12Signer = require('@signpdf/signer-p12').P12Signer;

const app = express();
const PORT = 3000;

// Configuração do filtro de arquivo do Multer
const fileFilter = (req, file, cb) => {
    // Aceitar apenas arquivos PDF
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Não é um arquivo PDF'), false);
    }
};

// Configuração de armazenamento do Multer com filtro
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, fileFilter: fileFilter });

app.post('/upload-and-sign', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or file is not a PDF.' });
  }
  const file = req.file;

  // certificate.p12 is the certificate that is going to be used to sign
  const certificatePath = path.join(__dirname, 'certificate.p12');
  const certificateBuffer = fs.readFileSync(certificatePath);
  const signer = new P12Signer(certificateBuffer);

  const pdfDoc = await PDFDocument.load(file.buffer);

  pdflibAddPlaceholder({
    pdfDoc: pdfDoc,
    reason: 'The user is declaring consent through JavaScript.',
    contactInfo: 'signpdf@example.com',
    name: 'John Doe',
    location: 'Free Text Str., Free World',
  });

  const lastPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1)
  lastPage.drawText(`Signed by: John Doe`, {
    x: 25,
    y: 10,
    size: 12,
    lineHeight: 24,
    opacity: 0.75,
  },)

  const pdfBytes = await pdfDoc.save()
  const pdfBytesSigned = await signpdf.sign(pdfBytes, signer, new Date())
    
  const readStream = new stream.PassThrough();
  readStream.end(pdfBytesSigned);

  res.set('Content-disposition', 'attachment; filename=' + file.filename);
  res.set('Content-Type', 'application/pdf');

  readStream.pipe(res);
});

// Endpoint para validar a assinatura de um PDF
app.post('/validate-pdf', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or file is not a PDF.' });
  }

  const file = req.file;

  // Carregar o PDF
  const pdfBytes = await fs.readFile(documentPath);
  const pdfDoc = await PDFDocument.load(file.buffer());
  const fileBuffer = fs.readFileSync(documentPath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);

  const hex = hashSum.digest('hex');

  console.log(hex);
  // Extrair a assinatura dos metadados do PDF
  const keywords = pdfDoc.getKeywords();
  const signature = keywords.split('Signature: ')[1]?.split(' ')[0];

  if (!signature) {
    return res.status(400).json({ message: 'Nenhuma assinatura encontrada nos metadados do PDF.' });
  }

  pdfDoc.setKeywords([`Signature: `]);
  // console.log(await pdfDoc.save())

  // Criar um objeto de verificação usando a chave pública
  const verify = createVerify('sha256');
  verify.update(await pdfDoc.save());
  verify.end();

  const sign = createSign('sha256');
  sign.update(await pdfDoc.save());
  sign.end();
  const signature1 = sign.sign(fs.readFileSync('privateKey.pem'), 'hex');
  // console.log(signature1)

  // Verificar a assinatura
  const isValid = verify.verify(fs.readFileSync('publicKey.pem'), signature, 'hex');

  if (isValid) {
    return res.json({ message: 'A assinatura é válida. O documento é autêntico e não foi alterado.' });
  } else {
    return res.status(400).json({ message: 'A assinatura é inválida. O documento foi alterado ou a assinatura é incorreta.' });
  }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
