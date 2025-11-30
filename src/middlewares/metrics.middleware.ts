import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metrics.service';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const ruta = req.route?.path || req.path || 'unknown';

    res.on('finish', async () => {
        const duracion = Date.now() - start;

        console.log(`[METRICS] Ruta: ${ruta} | Método: ${req.method} | Duración: ${duracion}ms | Status: ${res.statusCode}`);

        try {
            // Enviar métrica HTTP
            await metricsService.registrarMetricaHTTP(req.method, ruta, res.statusCode);

            // Enviar métrica de tiempo de respuesta
            await metricsService.registrarTiempoEjecucion(ruta, duracion);

            // Si es un error (4xx o 5xx), registrar métrica de error
            if (res.statusCode >= 400) {
                await metricsService.registrarErrorMetrica(ruta, res.statusCode);
            }
        } catch (error) {
            console.error('[METRICS] Error al enviar métricas a CloudWatch:', error);
        }
    });

    next();
};