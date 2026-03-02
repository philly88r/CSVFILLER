import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  GEMINI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware: CORS
app.use('/*', cors({
  origin: '*', // In production, replace with your frontend URL
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Auth Helper
const validateKey = async (c: any) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const apiKey = authHeader.split(' ')[1]
  
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE api_key = ?')
    .bind(apiKey)
    .first()
  
  return user
}

// Endpoint: Health Check
app.get('/', (c) => c.text('CSVFILLER API is Online'))

// Endpoint: Generate API Key (Internal/Admin for now)
app.post('/admin/create-user', async (c) => {
  const { email, tier } = await c.req.json()
  const id = crypto.randomUUID()
  const apiKey = `sk_live_${crypto.randomUUID().replace(/-/g, '')}`
  
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, api_key, tier) VALUES (?, ?, ?, ?)'
  ).bind(id, email, apiKey, tier || 'free').run()
  
  return c.json({ apiKey, email, tier: tier || 'free' })
})

// Endpoint: Process/Generate CSV
app.post('/v1/process', async (c) => {
  const user = await validateKey(c)
  if (!user) return c.json({ error: 'Unauthorized: Invalid or missing API Key' }, 401)

  const { prompt, currentData, instructions, mode } = await c.req.json()

  // Guard: Usage Limits for Free Tier
  if (user.tier === 'free' && user.usage_count >= 10) {
    return c.json({ error: 'Monthly limit reached for Free Tier. Please upgrade.' }, 403)
  }

  const systemPrompt = mode === 'create' 
    ? `You are an expert data engineer. Generate a highly accurate dataset based on: "${prompt}". 
       Return ONLY a raw JSON array of objects. Do not include markdown formatting or explanations. 
       Ensure the data is realistic and high quality.`
    : `You are an expert data engineer. Process this CSV data: ${JSON.stringify(currentData)}. 
       Apply these instructions: "${instructions}". 
       Return ONLY the updated JSON array of objects. Do not include markdown.`

  // Call Gemini
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${c.env.GEMINI_API_KEY}`
  
  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    })
  })

  const result: any = await response.json()
  const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text

  try {
    const parsedData = JSON.parse(generatedText)
    
    // Log Usage
    await c.env.DB.prepare('UPDATE users SET usage_count = usage_count + 1 WHERE id = ?')
      .bind(user.id)
      .run()

    return c.json({
      success: true,
      data: parsedData,
      usage: user.usage_count + 1
    })
  } catch (e) {
    return c.json({ error: 'Failed to parse AI response', raw: generatedText }, 500)
  }
})

export default app
