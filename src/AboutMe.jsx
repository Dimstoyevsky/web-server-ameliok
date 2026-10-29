import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './AboutMe.css'

/* ============================================================
   EDIT DI SINI AJA — semua yang bisa diganti ada di object ini
   ============================================================ */
const PROFILE = {
  // Video background (MP4). Taruh di public/about/bg.mp4
  // Isi null kalau nggak mau pakai video
  video: '/about/bg.mp4',

  // EFEK OVERLAY: video efek lu, tampil DI BELAKANG foto (di atas background).
  // Taruh di public/about/effect.mp4. Isi null kalau belum ada.
  effect: '/about/effect.mp4',
  // Chroma key otomatis menghapus warna hijau dari effect.mp4.
  // Efek lainnya tetap tampil normal di atas background merah.
  effectOpacity: 1, // 0 - 1

  // Overlay merah + gelap di pinggir video (biar teks gampang kebaca).
  // false = video tampil polos, efek lu sendiri nggak ketimpa
  videoTint: false,

  // Foto lu. Taruh di public/about/me.png
  photo: '/about/me.png',

  // 'cutout' = PNG transparan (udah dihapus background-nya), outline ngikutin badan
  // 'frame'  = foto biasa (masih ada background) -> tampil sebagai kartu miring
  photoMode: 'frame',

  // Nama besar + strip hitam di bawahnya
  name: 'DIMAS',
  nameLabel: 'GOONER',

  // Teks tulisan tangan di samping karakter (enter = baris baru)
  quote: 'Tiang sae madangi\nTiang jaler metengi.',

  // Teks kecil miring di samping kanan
  tag: 'Student',

  // Logo kiri bawah (PNG transparan). Taruh di public/about/logo.png
  // Isi null kalau nggak mau tampil logo
  logo: '/about/logo.png',
  logoAlt: 'Logo UNESA',
  logoCaption: 'UNESA', // tulisan kecil di bawah logo
  badge: 'INFORMATICS', // tulisan bergaris bawah di sebelah logo

  // Credit kanan bawah (kosongin '' kalau nggak mau)
  credit: 'Created by :\nDimasR',
}

// Menu ala battle command Persona 5.
// icon = path gambar di public/about/icons/ (atau teks biasa kalau mau)
// sfx  = suara saat pointer menyentuh tombol. Taruh di public/about/sfx/. Kosongin (null) -> pakai SFX.select
//        Kalau file nggak ketemu, otomatis diganti bunyi "beep" sintetis (pitch beda tiap tombol).
// hl   = nomor huruf (mulai 0) yang dibuat kotak putih ala ransom-note P5
const ICON = (name) => `/about/icons/${name}.png`

const SFX = {
  select: '/about/sfx/select.mp3', // bunyi saat pointer menyentuh tombol (default semua tombol)
  back:   '/about/sfx/back.mp3',   // tombol BACK (saat disentuh)
}
const SFX_VOLUME = 0.6

const COMMANDS_LEFT = [
  { label: 'PTI26',    sub: '1st Semester', icon: ICON('l2'),   sfx: null, pitch: 1.0 },
  { label: 'Protocol', sub: '13',           icon: ICON('dpad'), sfx: null, pitch: 1.15 },
]
const COMMANDS_RIGHT = [
  { label: '19',      sub: 'AGE',     icon: ICON('triangle'), sfx: null, pitch: 1.3 },
  { label: 'SURABAYA', sub: 'KREMIL', icon: ICON('square'),   sfx: null, pitch: 1.45, hl: [5, 6, 7] },
  { label: 'RICH',     sub: 'GOAL',   icon: ICON('circle'),   sfx: null, pitch: 1.6 },
  { label: 'GOON',    sub: 'HOBBY',   icon: ICON('cross'),    sfx: null, pitch: 1.8 },
]

/* ---------- SOUND EFFECT ---------- */
let audioCtx
function synthBlip(pitch = 1) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    audioCtx = audioCtx || new AC()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const t = audioCtx.currentTime
    const [f0, f1, dur, vol] = [620, 1500, 0.14, 0.09]
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(f0 * pitch, t)
    osc.frequency.exponentialRampToValueAtTime(f1 * pitch, t + dur)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  } catch {
    /* audio nggak boleh bikin halaman error */
  }
}

function playSfx(src, pitch = 1, volume = SFX_VOLUME) {
  if (!src) return synthBlip(pitch)
  let fell = false
  const fallback = () => {
    if (fell) return
    fell = true
    synthBlip(pitch)
  }
  const a = new Audio(src)
  a.volume = volume
  a.addEventListener('error', fallback, { once: true })
  a.play().catch((err) => {
    // sentuh tombol sebelum user pernah klik/tekan apa pun -> browser blokir, jangan dipaksa
    if (err?.name !== 'NotAllowedError') fallback()
  })
}
/* ============================================================ */


/* Render video efek ke canvas dan jadikan HANYA warna hijau transparan.
   Dengan begitu warna merah dari background tetap merah, bukan tercampur. */
function EffectOverlay({ src, opacity = 1 }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { willReadFrequently: true })
    if (!video || !canvas || !ctx) return

    let frameId = 0
    let lastDraw = 0
    let cancelled = false

    const render = (now = 0) => {
      if (cancelled) return
      frameId = requestAnimationFrame(render)
      if (now - lastDraw < 30 || video.readyState < 2 || !video.videoWidth) return
      lastDraw = now

      const w = video.videoWidth
      const h = video.videoHeight
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      try {
        ctx.drawImage(video, 0, 0, w, h)
        const frame = ctx.getImageData(0, 0, w, h)
        const pixels = frame.data
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          const dominance = g - Math.max(r, b)

          // Green screen: hijau dominan saja yang dikunci; biru, merah,
          // putih, dan hitam tetap dipertahankan. Tepi dibuat lebih halus.
          if (g > 70 && dominance > 18 && g > r * 1.18 && g > b * 1.18) {
            const key = Math.max(0, Math.min(1, (dominance - 18) / 48))
            pixels[i + 3] = Math.round(pixels[i + 3] * (1 - key))
          }
        }
        ctx.putImageData(frame, 0, 0)
      } catch (err) {
        // Jika browser menolak pemrosesan frame, jangan hentikan halaman.
        console.warn('Effect chroma key gagal memproses frame:', err)
      }
    }

    video.play().catch(() => {})
    frameId = requestAnimationFrame(render)
    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
    }
  }, [src])

  return (
    <>
      <video
        ref={videoRef}
        className="ab-effect-source"
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        className="ab-effect"
        style={{ opacity }}
        aria-hidden="true"
      />
    </>
  )
}

function Star({ className }) {
  return (
    <svg className={`ab-star ${className}`} viewBox="0 0 100 100" aria-hidden="true">
      <polygon
        points="50,6 61,38 95,38 67,58 78,92 50,71 22,92 33,58 5,38 39,38"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Command({ item, side, className }) {
  const stripRef = useRef(null)
  const isImage = item.icon.startsWith('/')

  // suara: saat pointer menyentuh (atau tombol difokus pakai keyboard)
  const touch = () => playSfx(item.sfx || SFX.select, item.pitch)

  // klik: animasi "pencet" saja, tanpa suara
  const press = () => {
    const el = stripRef.current
    if (el) {
      el.classList.remove('is-pressed')
      void el.offsetWidth // restart animasi
      el.classList.add('is-pressed')
    }
  }

  const icon = (
    <span className="p5c-icon" aria-hidden="true">
      {isImage ? <img src={item.icon} alt="" /> : item.icon}
    </span>
  )

  return (
    <button
      type="button"
      className={`p5c p5c--${side} ${className ?? ''}`}
      onClick={press}
      onPointerEnter={touch}
      onFocus={touch}
    >
      <span className="p5c-shard" aria-hidden="true" />
      <span
        ref={stripRef}
        className="p5c-strip"
        onAnimationEnd={(e) => e.currentTarget.classList.remove('is-pressed')}
      >
        {side === 'right' && icon}
        <span className="p5c-label" aria-label={item.label}>
          {[...item.label].map((ch, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`p5c-ch${i === 0 ? ' is-first' : ''}${item.hl?.includes(i) ? ' is-hl' : ''}`}
            >
              {ch}
            </span>
          ))}
        </span>
        {side === 'left' && icon}
      </span>
      <span className="p5c-sub">{item.sub}</span>
    </button>
  )
}

export default function AboutMe() {
  const p = PROFILE
  const navigate = useNavigate()

  // Halaman lain (Resume, Side Projects) bisa balik pakai Esc/Backspace/←.
  // About dulu nggak punya jalan keluar sama sekali.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'ArrowLeft') {
        navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const photoClass = `ab-photo${p.photoMode === 'frame' ? ' ab-photo--frame' : ''}`

  return (
    <main className="ab-page">
      <section className="ab-stage" aria-label="About me">
        {/* background shapes */}
        <div className="ab-bg" />
        {p.video && (
          <>
            <video
              className="ab-video"
              src={p.video}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            {p.videoTint && <div className="ab-video-tint" />}
          </>
        )}

        {/* effect overlay: hapus hijau dengan chroma key, tanpa blend mode */}
        {p.effect && <EffectOverlay src={p.effect} opacity={p.effectOpacity} />}

        {/* decorations */}
        <Star className="s1" />
        <Star className="s2" />
        <Star className="s3" />
        <Star className="s4" />
        <Star className="s5" />

        {/* photo */}
        <img
          className={photoClass}
          src={p.photo}
          alt={p.name}
          onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
        />

        {/* name */}
        <div className="ab-name-wrap">
          <h1 className="ab-name">{p.name}</h1>
          <div className="ab-name-label">
            <span>{p.nameLabel}</span>
          </div>
        </div>

        {/* quote + tag */}
        <p className="ab-quote">{p.quote}</p>
        <span className="ab-tag">{p.tag}</span>

        {/* commands */}
        {COMMANDS_LEFT.map((c, i) => (
          <Command key={c.label} item={c} side="left" className={`l${i}`} />
        ))}
        {COMMANDS_RIGHT.map((c, i) => (
          <Command key={c.label} item={c} side="right" className={`r${i}`} />
        ))}

        {/* bottom-left logo + badge */}
        <div className="ab-brand">
          {p.logo && (
            <div className="ab-logo">
              <img
                src={p.logo}
                alt={p.logoAlt}
                onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
              />
              <span>{p.logoCaption}</span>
            </div>
          )}
          <span className="ab-badge">{p.badge}</span>
        </div>

        {p.credit && <p className="ab-credit">{p.credit}</p>}

        {/* back */}
        <button type="button" className="ab-back" onPointerEnter={() => playSfx(SFX.back, 0.8)} onClick={() => navigate('/')}>
          <span>BACK</span>
          <kbd>ESC</kbd>
        </button>
      </section>
    </main>
  )
}
