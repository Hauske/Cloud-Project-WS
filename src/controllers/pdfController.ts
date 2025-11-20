import { Request, Response } from "express";
import axios from "axios";
import prisma from "../prisma/client";

class PDFController {
    async generatePDF(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { htmlContent } = req.body;

            if (!htmlContent) {
                return res.status(400).json({ error: 'htmlContent es requerido' });
            }

            const cv = await prisma.cV.findUnique({
                where: { id },
                select: {
                    id: true,
                    data: true,
                }
            });

            if (!cv) {
                return res.status(404).json({ error: 'CV no encontrado' });
            }

            const payload = {
                cvId: id,
                htmlContent: htmlContent,
                s3Bucket: process.env.AWS_S3_BUCKET || 'cvcloud-pdfs-bucket',
                fileName: `cv-${id}-${Date.now()}.pdf`
            };

            console.log('Enviando solicitud a API Gateway:', { 
                cvId: id, 
                fileName: payload.fileName,
                apiUrl: process.env.API_GATEWAY_URL 
            });

            const apiGatewayUrl = process.env.API_GATEWAY_URL;
            
            if (!apiGatewayUrl) {
                return res.status(500).json({ 
                    error: 'API Gateway URL no configurada' 
                });
            }

            const response = await axios.post(apiGatewayUrl, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            const result = response.data;

            console.log('Respuesta de API Gateway:', result);

            return res.status(200).json({
                message: 'PDF generado exitosamente',
                pdfUrl: result.pdfUrl,
                fileName: result.fileName
            });

        } catch (e) {
            console.error('Error generando PDF:', e);
            
            if (axios.isAxiosError(e)) {
                return res.status(500).json({ 
                    error: 'Error al comunicarse con el servicio de generación de PDF',
                    details: e.response?.data || e.message
                });
            }
            
            return res.status(500).json({ 
                error: 'Error al generar el PDF',
                details: e instanceof Error ? e.message : 'Unknown error'
            });
        }
    }
}

export default new PDFController();