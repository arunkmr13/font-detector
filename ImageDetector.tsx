'use client'
import { useState, useCallback, useRef } from 'react'
import { detectFont, pollJob, DetectedFont } from '@/lib/api'

type State = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export default function ImageDetector() {
  const [state, setState] = useState<State>('idle')
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [filename, setFilename] = useState('')
  const [results, setResults] = useState<DetectedFont[]>([])
  const [error, setError] = useState('')
  const [processingMs, setProcessingMs] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, WEBP)')
      setState('error')
      return
    }
    // Preview
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setFilename(file.name)
    setState('uploading')
    setError('')

    try {
      const { job_id } = await detectFont(file)
      setState('processing')
      const job = await pollJob(job_id)
      if (job.status === 'failed') throw new Error(job.error || 'Detection failed')
      setResults((job.result as DetectedFont[]) || [])
      setProcessingMs(job.processing_time_ms)
      setState('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setState('error')
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const reset = () => {
    setState('idle')
    setPreview(null)
    setResults([])
    setError('')
    setFilename('')
    setProcessingMs(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>

      {/* Drop zone */}
      {state === 'idle' && (
        <div
          className={`drop-zone ${dragging ? 'dragging' : ''}`}
          style={{ padding: '48px 32px', textAlign: 'center', marginBottom: 24 }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
          <div style={{ fontSize: 32, marginBottom: 12 }}>⬆</div>
          <div style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 6, fontFamily: 'Playfair Display, serif' }}>
            Drop an image here
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            PNG, JPG, WEBP — up to 10MB
          </div>
          <button className="btn-primary">Choose file</button>
        </div>
      )}

      {/* Processing state */}
      {(state === 'uploading' || state === 'processing') && (
        <div className="card" style={{ textAlign: 'center', padding: '48px', marginBottom: 24 }}>
          {preview && (
            <div style={{ marginBottom: 20 }}>
              <img src={preview} alt="Preview" style={{
                maxHeight: 160, maxWidth: '100%', borderRadius: 8,
                border: '0.5px solid var(--border)', objectFit: 'contain'
              }} />
            </div>
          )}
          <div style={{
            width: 32, height: 32, border: '2px solid var(--border-light)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {state === 'uploading' ? 'Uploading image...' : 'Analysing typography...'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, fontFamily: 'DM Mono, monospace' }}>
            {filename}
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="card" style={{ borderColor: 'var(--red)', background: 'var(--red-bg)', marginBottom: 24, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>{error}</div>
          <button className="btn-ghost" onClick={reset}>Try again</button>
        </div>
      )}

      {/* Results */}
      {state === 'done' && (
        <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>
          {/* Image + header */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
            {preview && (
              <img src={preview} alt="Uploaded" style={{
                width: 80, height: 80, objectFit: 'cover', borderRadius: 8,
                border: '0.5px solid var(--border)', flexShrink: 0
              }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace', marginBottom: 4 }}>
                {filename}
              </div>
              <div style={{ fontSize: 15, fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)', marginBottom: 6 }}>
                {results.length} font{results.length !== 1 ? 's' : ''} detected
              </div>
              {processingMs && (
                <span className="badge badge-gray">{processingMs}ms</span>
              )}
            </div>
            <button className="btn-ghost" onClick={reset} style={{ flexShrink: 0 }}>New image</button>
          </div>

          {/* Font results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map((font, i) => (
              <div key={i} className="card" style={{
                padding: '16px 20px',
                borderColor: i === 0 ? 'var(--accent-dim)' : 'var(--border)',
                background: i === 0 ? 'var(--accent-bg)' : 'var(--bg-card)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {i === 0 && <span className="badge badge-gold">Best match</span>}
                    <span style={{
                      fontFamily: 'Playfair Display, serif',
                      fontSize: i === 0 ? 20 : 16,
                      color: i === 0 ? 'var(--accent)' : 'var(--text-primary)',
                    }}>{font.name}</span>
                    {font.category && (
                      <span className="badge badge-gray">{font.category}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
                      {Math.round(font.confidence * 100)}%
                    </span>
                    {font.download_url && (
                      <a href={font.download_url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>
                        Get font ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="confidence-bar">
                  <div className="confidence-fill" style={{ width: `${font.confidence * 100}%` }} />
                </div>

                {/* Metadata row */}
                <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                  {font.license_type && (
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace' }}>
                      License: {font.license_type}
                    </span>
                  )}
                  {font.price_usd !== null && font.price_usd !== undefined && (
                    <span className={`badge ${font.price_usd === 0 ? 'badge-green' : 'badge-gray'}`}>
                      {font.price_usd === 0 ? 'Free' : `$${font.price_usd}`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
