<div align="center">
  <h3 align="center">Puppeteer</h3>
  <div>
  <a href="https://bgcp.vercel.app/article/71db6d70-3b3c-4fd0-846e-7b6ae6f8f080">
  <img src="https://img.shields.io/badge/Download PDF (ENGLISH)-black?style=for-the-badge&logoColor=white&color=000000" alt="three.js" />
  </a>
  </div>
</div>

## 🚀 Introdução à Assinatura Digital de Documentos

Neste tutorial, vamos mergulhar em como assinar digitalmente qualquer documento usando Node.js, garantindo a autenticidade e integridade dos documentos transmitidos eletronicamente. As assinaturas digitais são fundamentais na troca segura de documentos, permitindo verificar que um documento não foi alterado após ser assinado e confirmar a identidade do signatário.

### 🌟 Principais Características:

- **🔒 Segurança Reforçada**: Ao criar um hash e assinar digitalmente documentos, garantimos que permaneçam à prova de violações.
- **✅ Verificação de Integridade**: Quaisquer alterações feitas em um documento após a assinatura invalidam a assinatura, garantindo a integridade do documento.
- **🔏 Autenticidade**: Valida a identidade do signatário, vinculando-o diretamente ao documento.
- **📈 Não Repúdio**: Os signatários não podem negar sua associação com o documento assinado.

## 🛠️ Instalação

Antes de começar, certifique-se de que o Node.js está instalado em seu sistema. Utilizaremos o módulo `crypto` para criar hashes e assinaturas digitais, ao lado de `fs` para manipulação de arquivos. Nenhum pacote extra é necessário para a funcionalidade básica.

## 📊 Uso Básico

Nosso projeto consistirá em duas funcionalidades principais:
1. **Assinando um Documento**: Criando um hash do conteúdo do documento e anexando uma assinatura digital dentro de seus metadados.
2. **Validando um Documento Assinado**: Verificando a assinatura do documento para verificar sua autenticidade e integridade.

Para criar um servidor Express que lida com o upload e a assinatura de documentos, vamos seguir estes passos. Este servidor permitirá aos usuários fazer o upload de um arquivo, que será então assinado digitalmente. A assinatura será armazenada nos metadados do documento (para fins deste exemplo, vamos simplificar e apenas simular essa parte), e o documento assinado será enviado de volta ao usuário.

### Parte 1: Configuração Inicial

Primeiro, certifique-se de ter o Node.js instalado. Em seguida, crie uma nova pasta para o projeto e inicialize um novo projeto Node.js com o comando `npm init -y`.

1. Instale as dependências necessárias:

```bash
npm install express multer pdf-lib fs-extra @signpdf/signpdf @signpdf/signer-p12 @signpdf/placeholder-pdf-lib
```

 2. Gerar Chave Privada e Certificado

Primeiro, você precisa gerar sua chave privada e um certificado autoassinado. Isso pode ser feito usando o OpenSSL com os seguintes comandos no terminal:

```bash
# Gerar uma chave privada RSA
openssl genpkey -algorithm RSA -out privatekey.pem -pkeyopt rsa_keygen_bits:2048

# Criar um pedido de assinatura de certificado (CSR)
openssl req -new -key privatekey.pem -out request.csr

# Gerar o certificado autoassinado usando o CSR
openssl x509 -signkey privatekey.pem -in request.csr -req -days 365 -out certificate.pem
```

Esses comandos geram uma chave privada (`privatekey.pem`) e um certificado autoassinado (`certificate.pem`), válido por 365 dias.

3. Criar um Arquivo P12

```bash
openssl pkcs12 -export -out certificate.p12 -inkey privatekey.pem -in certificate.pem
```
### Parte 2: Servidor Express com Upload de Arquivo e Assinatura Digital

Crie um arquivo chamado `server.js` e adicione o seguinte código para configurar o servidor Express, incluindo os endpoints para fazer upload de um arquivo e assiná-lo digitalmente:

```javascript
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

```

### Parte 3: Testando o Servidor

1. Execute o servidor com o comando `node server.js`.

2. Use um cliente de API como Postman ou envie um formulário HTML com um campo de arquivo para testar o upload e a assinatura de um documento.

3. Verifica se o pdf foi assinado, deve conter um campo `Signed by: John Doe`, é possível validar tbm por um aplicativo que ler leituras de assinaturas como o abode reader. Essa assinatura usada sempre vai ser invalida a não ser que voce utilize um certificado válido.

## 🏆 Conclusão

Implementar assinaturas digitais para documentos aumenta significativamente a segurança e a confiabilidade das trocas de documentos eletrônicos. Seguindo este tutorial, você aprendeu a assinar documentos digitalmente. Continue explorando, experimentando e acima de tudo, se divertindo com a programação!