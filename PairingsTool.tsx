'use client'
import { useState } from 'react'
import { getPairings, PairingResponse } from '@/lib/api'

const USE_CASES = ['editorial', 'tech product', 'luxury brand', 'startup', 'portfolio', 'e-commerce']
const ROLE_COLORS: Record<string, string> = {
  body: '#93c5fd',
  heading: '#c4b5fd',
  accent: '#86efac',
  code: '#fca5a5',
}

export default function PairingsTool() {
  const [fontName, setFontName] = useState('')
  const [useCase, setUseCase] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PairingResponse | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!fontName.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const data = await getPairings(fontName.trim(), useCase || undefined)
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not get pairings. Is your Gemini API key set?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>

      {/* Input card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Base font
            </div>
            <input
              className="input-field"
              placeholder="Garamond"
              value={fontName}
              onChange={e => setFontName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Use case (optional)
            </div>
            <select
              className="input-field"
              value={useCase}
              onChange={e => setUseCase(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="">Any context</option>
              {USE_CASES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading || !fontName.trim()}>
            {loading ? 'Asking AI...' : 'Get pairings →'}
          </button>

          {/* Quick font suggestions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Garamond', 'Helvetica Neue', 'Bodoni', 'Futura', 'Georgia'].map(f => (
              <button key={f} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}
                onClick={() => setFontName(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{
            width: 32, height: 32, border: '2px solid var(--border-light)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Consulting the typographer...
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace' }}>
            Gemini is finding perfect pairings for {fontName}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ borderColor: 'var(--red)', background: 'var(--red-bg)', padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Pairings for
            </div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: 'var(--accent)', marginBottom: 8 }}>
              {result.base_font}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 560 }}>
              {result.overall_rationale}
            </div>
          </div>

          {/* Pairing cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
            {result.pairings.map((pairing, i) => {
              const color = ROLE_COLORS[pairing.role] || 'var(--text-secondary)'
              return (
                <div key={i} className="card" style={{
                  borderColor: 'var(--border-light)',
                  animation: `fadeUp 0.4s ease ${i * 0.1}s forwards`,
                  opacity: 0,
                }}>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{
                      fontSize: 10, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase',
                      letterSpacing: '0.1em', color, background: color + '15',
                      padding: '2px 8px', borderRadius: 4, border: `0.5px solid ${color}30`,
                    }}>
                      {pairing.role}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.2 }}>
                    {pairing.font_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {pairing.rationale}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Visual type specimen */}
          <div className="card" style={{ padding: 28, borderColor: 'var(--border-light)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace', marginBottom: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Type specimen preview
            </div>
            <div style={{ borderBottom: '0.5px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>Heading — {result.base_font}</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                The quick brown fox
              </div>
            </div>
            {result.pairings.map((p, i) => (
              <div key={i} style={{ borderBottom: i < result.pairings.length - 1 ? '0.5px solid var(--border)' : 'none', paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace', marginBottom: 4 }}>
                  {p.role} — {p.font_name}
                </div>
                <div style={{ fontSize: p.role === 'body' ? 15 : p.role === 'code' ? 13 : 18, color: 'var(--text-secondary)', fontFamily: p.role === 'code' ? 'DM Mono, monospace' : 'inherit', lineHeight: 1.6 }}>
                  {p.role === 'body' ? 'Typography is the craft of arranging type to make written language legible, readable, and appealing when displayed.' :
                   p.role === 'code' ? 'const font = detectFont(image);' :
                   'Good typography is invisible'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
