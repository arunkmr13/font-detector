'use client'
import { useState } from 'react'
import { scanURL, pollJob, ScannedFont } from '@/lib/api'

type State = 'idle' | 'scanning' | 'done' | 'error'

export default function URLScanner() {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<State>('idle')
  const [fonts, setFonts] = useState<ScannedFont[]>([])
  const [error, setError] = useState('')
  const [scannedUrl, setScannedUrl] = useState('')
  const [processingMs, setProcessingMs] = useState<number | null>(null)

  const handleScan = async () => {
    if (!url.trim()) return
    let target = url.trim()
    if (!target.startsWith('http')) target = 'https://' + target

    setState('scanning')
    setError('')
    setScannedUrl(target)

    try {
      const { job_id } = await scanURL(target)
      const job = await pollJob(job_id)
      if (job.status === 'failed') throw new Error(job.error || 'Scan failed')
      setFonts((job.result as ScannedFont[]) || [])
      setProcessingMs(job.processing_time_ms)
      setState('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not scan URL')
      setState('error')
    }
  }

  const reset = () => {
    setState('idle')
    setFonts([])
    setError('')
    setUrl('')
    setScannedUrl('')
    setProcessingMs(null)
  }

  const webFonts = fonts.filter(f => f.is_web_font)
  const systemFonts = fonts.filter(f => !f.is_web_font)

  return (
    <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>

      {/* Input */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Website URL
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="input-field"
            placeholder="stripe.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            disabled={state === 'scanning'}
          />
          <button
            className="btn-primary"
            onClick={handleScan}
            disabled={state === 'scanning' || !url.trim()}
            style={{ flexShrink: 0 }}
          >
            {state === 'scanning' ? 'Scanning...' : 'Scan →'}
          </button>
        </div>

        {/* Quick examples */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', alignSelf: 'center' }}>Try:</span>
          {['stripe.com', 'notion.so', 'linear.app', 'vercel.com'].map(site => (
            <button key={site} className="btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }}
              onClick={() => { setUrl(site); }}>
              {site}
            </button>
          ))}
        </div>
      </div>

      {/* Scanning */}
      {state === 'scanning' && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{
            width: 32, height: 32, border: '2px solid var(--border-light)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Rendering page & extracting fonts...</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace' }}>{scannedUrl}</div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="card" style={{ borderColor: 'var(--red)', background: 'var(--red-bg)', textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>{error}</div>
          <button className="btn-ghost" onClick={reset}>Try again</button>
        </div>
      )}

      {/* Results */}
      {state === 'done' && (
        <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)', marginBottom: 4 }}>
                {fonts.length} fonts found
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace' }}>
                {scannedUrl} {processingMs && `· ${processingMs}ms`}
              </div>
            </div>
            <button className="btn-ghost" onClick={reset}>New scan</button>
          </div>

          {/* Web fonts */}
          {webFonts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--accent-dim)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Web fonts ({webFonts.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {webFonts.map((font, i) => (
                  <FontRow key={i} font={font} highlight />
                ))}
              </div>
            </div>
          )}

          {/* System fonts */}
          {systemFonts.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                System fonts ({systemFonts.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {systemFonts.map((font, i) => (
                  <FontRow key={i} font={font} highlight={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FontRow({ font, highlight }: { font: ScannedFont; highlight: boolean }) {
  return (
    <div className="card" style={{
      padding: '14px 16px',
      borderColor: highlight ? 'var(--border-light)' : 'var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: 'var(--text-primary)' }}>
            {font.name}
          </span>
          {font.is_web_font && <span className="badge badge-gold">Web font</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {font.css_value}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
          {font.element_count} elements
        </span>
      </div>
    </div>
  )
}
