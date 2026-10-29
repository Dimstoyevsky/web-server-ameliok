import { useEffect, useRef, useState } from "react";
import { playSelectSound } from "./utils/audio.js";

// ====== PENGATURAN (ubah sesuai kebutuhan) ======
// Taruh file video di folder  public/video/  (bukan di src/assets)
const INTRO_SRC = "/video/intro.mp4";      // video intro, sekitar 6 detik
const BG_SRC = "/video/title-bg.mp4";      // video background layar "press any button" (loop)
const INTRO_MAX_MS = 6000;                 // intro otomatis lanjut setelah 6 detik
const INPUT_DELAY_MS = 500;                // jeda sebelum tombol dianggap valid di layar title

const LINE_1 = "DIMAS'S";
const LINE_2 = "PERSONA";
const PROMPT = "PRESS ANY BUTTON";
// ================================================

export default function TitleScreen({ onStart }) {
  const [phase, setPhase] = useState("intro"); // "intro" -> "title"
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const phaseRef = useRef("intro");
  const readyRef = useRef(false);
  const startedRef = useRef(false);

  const goTitle = () => {
    if (phaseRef.current !== "intro") return;
    phaseRef.current = "title";
    setPhase("title");
    setTimeout(() => setMounted(true), 60);
    setTimeout(() => {
      readyRef.current = true;
    }, INPUT_DELAY_MS);
  };

  // satu fungsi untuk semua input (klik / keyboard)
  const handleInput = () => {
    if (phaseRef.current === "intro") {
      goTitle(); // tekan apa saja saat intro = lewati intro
      return;
    }
    if (!readyRef.current || startedRef.current) return;
    startedRef.current = true;
    playSelectSound();
    setLeaving(true);
    setTimeout(() => onStart?.(), 520);
  };

  // intro otomatis lanjut setelah INTRO_MAX_MS
  useEffect(() => {
    const t = setTimeout(goTitle, INTRO_MAX_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      // abaikan shortcut browser dan tombol modifier
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^F\d+$/.test(e.key)) return;
      if (["Shift", "Control", "Alt", "Meta", "Tab", "CapsLock"].includes(e.key)) return;
      handleInput();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <style>{`
        .ts-screen {
          position: absolute;
          inset: 0;
          z-index: 15;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
          background: #0d0d0d;
          transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.76, 0, 0.24, 1);
        }
        /* cadangan kalau video background belum ada */
        .ts-screen.title {
          background: linear-gradient(115deg, #0d0d0d 0 46%, #d92323 46% 64%, #0d0d0d 64% 100%);
        }
        .ts-screen.leaving {
          opacity: 0;
          transform: scale(1.1);
          pointer-events: none;
        }

        .ts-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .ts-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse at 30% 55%, rgba(13,13,13,0.0) 0%, rgba(13,13,13,0.55) 100%);
        }

        .ts-stack {
          position: absolute;
          left: 7vw;
          top: 14vh;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 7vh;
          pointer-events: none;
        }

        .ts-logo {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transform: skewX(-8deg) rotate(-4deg);
          transform-origin: left top;
          opacity: 0;
        }
        .ts-screen.mounted .ts-logo {
          animation: ts-slam 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes ts-slam {
          0%   { opacity: 0; transform: translateX(-70px) skewX(-8deg) rotate(-4deg) scale(1.25); }
          100% { opacity: 1; transform: translateX(0) skewX(-8deg) rotate(-4deg) scale(1); }
        }

        .ts-line {
          font-family: 'Persona5Main';
          font-style: italic;
          line-height: 0.86;
          letter-spacing: 3px;
          color: #ffffff;
          -webkit-text-stroke: 12px #0d0d0d;
          paint-order: stroke fill;
          text-shadow: 8px 8px 0 #d92323;
          white-space: nowrap;
        }
        .ts-line-1 { font-size: clamp(54px, 8.5vw, 124px); }
        .ts-line-2 { font-size: clamp(72px, 12vw, 176px); margin-left: 3vw; }

        .ts-prompt-wrap {
          position: relative;
          margin-left: 5vw;
          padding: 10px 34px;
          opacity: 0;
        }
        .ts-screen.mounted .ts-prompt-wrap {
          animation: ts-appear 0.3s ease 0.45s forwards;
        }
        @keyframes ts-appear {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .ts-cyan {
          position: absolute;
          inset: -4px -18px;
          background: #0dd9ff;
          z-index: 0;
          clip-path: polygon(0% 44%, 12% 4%, 84% 0%, 100% 38%, 88% 100%, 8% 94%);
          animation: ts-wiggle 0.9s ease-in-out infinite;
        }
        @keyframes ts-wiggle {
          0%   { clip-path: polygon(0% 56%, 10% 0%, 80% 7%, 100% 24%, 94% 100%, 6% 88%); }
          25%  { clip-path: polygon(0% 62%, 8% 6%, 88% 0%, 100% 34%, 90% 100%, 2% 94%); }
          50%  { clip-path: polygon(0% 40%, 16% 10%, 78% 0%, 100% 44%, 98% 92%, 10% 100%); }
          75%  { clip-path: polygon(0% 52%, 14% 0%, 84% 12%, 100% 28%, 92% 100%, 4% 82%); }
          100% { clip-path: polygon(0% 56%, 10% 0%, 80% 7%, 100% 24%, 94% 100%, 6% 88%); }
        }

        .ts-prompt {
          position: relative;
          z-index: 1;
          font-family: 'Persona5Main';
          font-size: clamp(22px, 2.8vw, 40px);
          letter-spacing: 3px;
          line-height: 1;
          color: #ffffff;
          -webkit-text-stroke: 8px #0d0d0d;
          paint-order: stroke fill;
          white-space: nowrap;
          transform: skewX(-6deg);
        }

        @media (prefers-reduced-motion: reduce) {
          .ts-screen.mounted .ts-logo { animation: none; opacity: 1; }
          .ts-screen.mounted .ts-prompt-wrap { animation: none; opacity: 1; }
          .ts-cyan { animation: none; }
        }
      `}</style>

      <div
        className={`ts-screen ${phase}${mounted ? " mounted" : ""}${leaving ? " leaving" : ""}`}
        onClick={handleInput}
        role="button"
        tabIndex={0}
        aria-label={phase === "intro" ? "Skip intro" : "Start"}
      >
        {phase === "intro" && (
          <video
            className="ts-video"
            src={INTRO_SRC}
            autoPlay
            muted
            playsInline
            onEnded={goTitle}
            onError={goTitle}
          />
        )}

        {phase === "title" && (
          <>
            <video className="ts-video" src={BG_SRC} autoPlay loop muted playsInline />
            <div className="ts-vignette" />

            <div className="ts-stack">
              <div className="ts-logo">
                <span className="ts-line ts-line-1">{LINE_1}</span>
                <span className="ts-line ts-line-2">{LINE_2}</span>
              </div>

              <div className="ts-prompt-wrap">
                <div className="ts-cyan" />
                <div className="ts-prompt">{PROMPT}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
