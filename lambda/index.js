const chromium = require('chrome-aws-lambda');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

exports.handler = async (event) => {
    let browser = null;
    
    try {
        console.log('Evento recibido:', JSON.stringify(event, null, 2));
        
        let payload = event;
        if (event.body && typeof event.body === 'string') {
            payload = JSON.parse(event.body);
        }
        
        const { cvId, htmlContent, s3Bucket, fileName } = payload;
        
        if (!htmlContent || !s3Bucket || !fileName) {
            throw new Error('Faltan parámetros requeridos: cvId, htmlContent, s3Bucket, fileName');
        }
        
        console.log('Parámetros validados:', { cvId, s3Bucket, fileName });
        
        // Iniciar Chromium
        console.log('Iniciando Chromium...');
        browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
        });
        
        console.log('Chromium iniciado, creando página...');
        const page = await browser.newPage();
        
        // Establecer contenido HTML
        console.log('Estableciendo contenido HTML...');
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });
        
        // Generar PDF
        console.log('Generando PDF...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0',
                right: '0',
                bottom: '0',
                left: '0'
            }
        });
        
        console.log('PDF generado, tamaño:', pdfBuffer.length, 'bytes');
        
        // Subir a S3
        console.log('Subiendo a S3...');
        const uploadParams = {
            Bucket: s3Bucket,
            Key: fileName,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
            ACL: 'public-read'
        };
        
        const uploadResult = await s3.upload(uploadParams).promise();
        
        console.log('PDF subido exitosamente:', uploadResult.Location);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'PDF generado exitosamente',
                pdfUrl: uploadResult.Location,
                fileName: fileName,
                cvId: cvId
            })
        };
        
    } catch (error) {
        console.error('Error en Lambda:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Error al generar PDF',
                message: error.message,
                stack: error.stack
            })
        };
        
    } finally {
        if (browser !== null) {
            console.log('Cerrando navegador...');
            await browser.close();
        }
    }
};