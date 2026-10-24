export async function GET() {
  return Response.json({ mode: process.env.GEMINI_API_KEY?.trim() ? 'ai-unverified' : 'simulation', gemini: Boolean(process.env.GEMINI_API_KEY?.trim()), documentAi: false, documentScanner: 'simulation-only', bigQuery: Boolean(process.env.BIGQUERY_DATASET), mysqlConfigured: Boolean(process.env.MYSQL_URL?.trim()) });
}
