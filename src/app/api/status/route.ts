export async function GET() {
  return Response.json({ mode: process.env.GEMINI_API_KEY?.trim() ? 'live' : 'manual', gemini: Boolean(process.env.GEMINI_API_KEY?.trim()), documentAi: Boolean(process.env.GOOGLE_CLOUD_PROJECT && process.env.DOCUMENT_AI_PROCESSOR_ID), bigQuery: Boolean(process.env.BIGQUERY_DATASET), mysqlConfigured: Boolean(process.env.MYSQL_URL?.trim()) });
}
