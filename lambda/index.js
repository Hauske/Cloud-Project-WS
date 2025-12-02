const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const metricsService = require('./metrics.service');

const s3Client = new S3Client();

exports.handler = async (event) => {
    let browser = null;
    const lambdaStart = Date.now();
    let templateId = 'unknown';
    
    try {
        console.log('Evento recibido:', JSON.stringify(event, null, 2));
        
        let payload = event;
        if (event.body && typeof event.body === 'string') {
            payload = JSON.parse(event.body);
        }
        
        const { cvId, htmlContent, s3Bucket, userName, templateId: reqTemplateId, cvTitle } = payload;
        templateId = reqTemplateId || 'executive';
        
        if (!htmlContent || !s3Bucket) {
            throw new Error('Faltan parámetros requeridos: cvId, htmlContent, s3Bucket');
        }
        
        const templateNames = {
            'executive': 'Ejecutivo',
            'minimal-premium': 'Minimalista',
            'minimalist-premium': 'Minimalista',
            'sidebar-dark': 'BarraLateral',
            'modern-grid': 'GridModerno',
            'compact': 'Compacto',
            'elegant': 'Elegante'
        };
        
        // Generar estructura: CVs/{userName}/{cvId}/CV-{cvTitle}-{tipo}.pdf
        const templateName = templateNames[templateId] || 'Ejecutivo';
        const safeUserName = (userName || 'user').replace(/[^a-zA-Z0-9-_]/g, '_');
        const safeCvTitle = (cvTitle || 'CV').replace(/[^a-zA-Z0-9-_]/g, '_');
        const fileName = `CVs/${safeUserName}/${cvId}/CV-${safeCvTitle}-${templateName}.pdf`;
        
        console.log('Parámetros validados:', { cvId, s3Bucket, userName, fileName });
        
        // Iniciar Chromium
        console.log('Iniciando Chromium...');
        const pdfStart = Date.now();
        
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
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
        
        const pdfDuration = Date.now() - pdfStart;
        const pdfSize = pdfBuffer.length;
        
        console.log('PDF generado, tamaño:', pdfSize, 'bytes, tiempo:', pdfDuration, 'ms');
        
        // Registrar métricas de generación de PDF
        await metricsService.registrarTiempoEjecucionLambda(pdfDuration, templateId);
        await metricsService.registrarTamañoPDF(pdfSize, templateId);
        
        // Subir a S3
        console.log('Subiendo a S3...');
        const s3Start = Date.now();
        
        const uploadCommand = new PutObjectCommand({
            Bucket: s3Bucket,
            Key: fileName,
            Body: pdfBuffer,
            ContentType: 'application/pdf'
        });
        
        await s3Client.send(uploadCommand);
        
        const s3Duration = Date.now() - s3Start;
        const pdfUrl = `https://${s3Bucket}.s3.amazonaws.com/${fileName}`;
        console.log('PDF subido exitosamente:', pdfUrl, 'Tiempo S3:', s3Duration, 'ms');
        
        // Registrar métrica de éxito
        const totalDuration = Date.now() - lambdaStart;
        await metricsService.registrarMetricaPDF(totalDuration, 200, templateId);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'PDF generado exitosamente',
                pdfUrl: pdfUrl,
                fileName: fileName,
                cvId: cvId,
                metrics: {
                    pdfGenerationTime: pdfDuration,
                    s3UploadTime: s3Duration,
                    totalTime: totalDuration,
                    pdfSize: pdfSize
                }
            })
        };
        
    } catch (error) {
        console.error('Error en Lambda:', error);
        
        // Registrar métrica de error
        const totalDuration = Date.now() - lambdaStart;
        await metricsService.registrarErrorLambda(templateId, error.message);
        await metricsService.registrarMetricaPDF(totalDuration, 500, templateId);
        
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