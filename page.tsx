'use client'
import { useState } from 'react'
import ImageDetector from '@/components/ImageDetector'
import URLScanner from '@/components/URLScanner'
import PairingsTool from '@/components/PairingsTool'

type Tab = 'detect' | 'scan' | 'pair'

export default function Home() {
  const [tab, setTab] = useState<Tab>('detect')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        borderBottom: '0.5px solid var(--border)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px',
        position: 'sticky',
        top: 0,
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 28, height: 28,
            background: 'var(--accent)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', fontFamily: 'Playfair Display, serif' }}>F</span>
          </div>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Font Detector
          </span>
          <span className="badge badge-gray" style={{ marginLeft: 4 }}>Beta</span>
        </div>

        <nav style={{ display: 'flex', gap: 2, background: 'var(--bg-card)', padding: '3px', borderRadius: 8, border: '0.5px solid var(--border)' }}>
          <button className={`tab-btn ${tab === 'detect' ? 'active' : ''}`} onClick={() => setTab('detect')}>
            Detect
          </button>
          <button className={`tab-btn ${tab === 'scan' ? 'active' : ''}`} onClick={() => setTab('scan')}>
            Scan URL
          </button>
          <button className={`tab-btn ${tab === 'pair' ? 'active' : ''}`} onClick={() => setTab('pair')}>
            Pairings
          </button>
        </nav>

        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace' }}>
          v0.1.0
        </div>
      </header>

      {/* Hero */}
      <div style={{
        padding: '64px 32px 48px',
        maxWidth: 720,
        margin: '0 auto',
        textAlign: 'center',
        animation: 'fadeUp 0.6s ease forwards',
      }}>
        <div style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--accent-dim)',
          fontFamily: 'DM Mono, monospace',
          marginBottom: 16,
        }}>
          Typography Intelligence Platform
        </div>
        <h1 className="font-display" style={{
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 400,
          lineHeight: 1.1,
          color: 'var(--text-primary)',
          margin: '0 0 16px',
          letterSpacing: '-0.02em',
        }}>
          {tab === 'detect' && <>Identify any<br /><em style={{ color: 'var(--accent)' }}>font</em> from an image</>}
          {tab === 'scan' && <>Scan any website's<br /><em style={{ color: 'var(--accent)' }}>typography</em></>}
          {tab === 'pair' && <>Find the perfect<br /><em style={{ color: 'var(--accent)' }}>font pairing</em></>}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
          {tab === 'detect' && 'Upload a screenshot, photo, or design — get instant font identification with confidence scores.'}
          {tab === 'scan' && 'Paste any URL and extract every font used on the page, including web fonts and system fonts.'}
          {tab === 'pair' && 'Enter a font name and get AI-powered pairing suggestions for body, heading, and accent roles.'}
        </p>
      </div>

      {/* Main content */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '0 32px 80px' }}>
        {tab === 'detect' && <ImageDetector />}
        {tab === 'scan' && <URLScanner />}
        {tab === 'pair' && <PairingsTool />}
      </main>
    </div>
  )
}
