const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export interface DetectedFont {
  name: string
  confidence: number
  category: string | null
  google_fonts_id: string | null
  download_url: string | null
  license_type: string | null
  price_usd: number | null
}

export interface JobResult {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result: DetectedFont[] | ScannedFont[] | null
  error: string | null
  created_at: string
  processing_time_ms: number | null
}

export interface ScannedFont {
  name: string
  css_value: string
  element_count: number
  is_web_font: boolean
  source_url: string | null
}

export interface FontPairing {
  role: string
  font_name: string
  rationale: string
}

export interface PairingResponse {
  base_font: string
  pairings: FontPairing[]
  overall_rationale: string
}

// Upload image for font detection
export async function detectFont(file: File): Promise<{ job_id: string; status: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/api/detect`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// Scan a URL for fonts
export async function scanURL(url: string): Promise<{ job_id: string; status: string; target_url: string }> {
  const res = await fetch(`${API_BASE}/api/scan-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// Poll job status
export async function getJobStatus(jobId: string): Promise<JobResult> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// Get font pairings
export async function getPairings(fontName: string, useCase?: string): Promise<PairingResponse> {
  const res = await fetch(`${API_BASE}/api/pairings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ font_name: fontName, use_case: useCase || null }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// Poll until job completes (max 30s)
export async function pollJob(jobId: string, onUpdate?: (status: string) => void): Promise<JobResult> {
  const maxAttempts = 30
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getJobStatus(jobId)
    onUpdate?.(result.status)
    if (result.status === 'completed' || result.status === 'failed') return result
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('Job timed out after 30 seconds')
}
