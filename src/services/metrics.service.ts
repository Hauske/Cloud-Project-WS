import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatchClient = new CloudWatchClient({
    region: process.env.AWS_REGION || 'us-east-1'
});

export class MetricsService {
    private namespace = 'CVCloud/Backend';
    private environment = process.env.NODE_ENV || 'local';

    async registrarMetricaHTTP(metodo: string, ruta: string, statusCode: number) {
        const rangoStatus = this.obtenerRangoStatus(statusCode);

        try {
            await cloudwatchClient.send(new PutMetricDataCommand({
                Namespace: this.namespace,
                MetricData: [
                    {
                        MetricName: 'HTTPRequests',
                        Value: 1,
                        Unit: 'Count',
                        Dimensions: [
                            { Name: 'Method', Value: metodo },
                            { Name: 'StatusRange', Value: rangoStatus },
                            { Name: 'Route', Value: ruta },
                            { Name: 'Environment', Value: this.environment }
                        ],
                        Timestamp: new Date()
                    }
                ]
            }));
        } catch (error) {
            console.error(`[METRICS] Error al enviar HTTPRequests a CloudWatch:`, error);
        }
    }

    async registrarTiempoEjecucion(ruta: string, duracionMs: number) {
        try {
            await cloudwatchClient.send(new PutMetricDataCommand({
                Namespace: this.namespace,
                MetricData: [
                    {
                        MetricName: 'ResponseTime',
                        Value: duracionMs,
                        Unit: 'Milliseconds',
                        Dimensions: [
                            { Name: 'Route', Value: ruta },
                            { Name: 'Environment', Value: this.environment }
                        ],
                        Timestamp: new Date()
                    }
                ]
            }));
        } catch (error) {
            console.error(`[METRICS] Error al enviar ResponseTime a CloudWatch:`, error);
        }
    }

    async registrarErrorMetrica(ruta: string, statusCode: number) {
        const rangoStatus = this.obtenerRangoStatus(statusCode);

        try {
            await cloudwatchClient.send(new PutMetricDataCommand({
                Namespace: this.namespace,
                MetricData: [
                    {
                        MetricName: 'Errors',
                        Value: 1,
                        Unit: 'Count',
                        Dimensions: [
                            { Name: 'Route', Value: ruta },
                            { Name: 'StatusRange', Value: rangoStatus },
                            { Name: 'Environment', Value: this.environment }
                        ],
                        Timestamp: new Date()
                    }
                ]
            }));
        } catch (error) {
            console.error(`[METRICS] Error al enviar métrica de errores:`, error);
        }
    }

    private obtenerRangoStatus(statusCode: number): string {
        if (statusCode >= 200 && statusCode < 300) return '2xx';
        if (statusCode >= 300 && statusCode < 400) return '3xx';
        if (statusCode >= 400 && statusCode < 500) return '4xx';
        if (statusCode >= 500) return '5xx';
        return 'other';
    }
}

export const metricsService = new MetricsService();