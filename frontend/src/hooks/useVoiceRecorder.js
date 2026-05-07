/**
 * hooks/useVoiceRecorder.js
 * =========================
 * Reusable voice recorder with automatic silence detection (VAD).
 *
 * Features:
 *  - AudioContext + AnalyserNode for real-time audio level monitoring
 *  - Auto-stops after configurable silence duration (default 1.8s)
 *  - Only starts silence countdown after MIN_RECORDING_MS to avoid instant cutoff
 *  - Exposes audioLevel (0–1) for waveform UI
 *  - micState: 'idle' | 'listening' | 'silence' | 'processing'
 *  - Manual stopRecording() still works as fallback
 */

import { useState, useRef, useCallback } from 'react';

const SILENCE_THRESHOLD  = 0.012;   // RMS below this = silence
const SILENCE_DURATION_MS = 1800;   // ms of sustained silence → auto-stop
const MIN_RECORDING_MS   = 1200;    // must record at least this long before auto-stop

export function useVoiceRecorder({
  onResult,                          // async (blob) => void  — called after stop
  mimeType = 'audio/webm',
  silenceMs = SILENCE_DURATION_MS,
  threshold = SILENCE_THRESHOLD,
} = {}) {
  const [micState, setMicState]     = useState('idle');
  const [audioLevel, setAudioLevel] = useState(0);

  const mrRef        = useRef(null);   // MediaRecorder
  const chunksRef    = useRef([]);
  const acRef        = useRef(null);   // AudioContext
  const rafRef       = useRef(null);   // requestAnimationFrame id
  const silenceStart = useRef(null);
  const startedAt    = useRef(null);   // recording start timestamp

  // ── Internal: cancel all tracking infra ──────────────────────────────────
  const _cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (acRef.current && acRef.current.state !== 'closed') {
      acRef.current.close().catch(() => {});
    }
    setAudioLevel(0);
    silenceStart.current = null;
  }, []);

  // ── stopRecording: manual OR auto ────────────────────────────────────────
  const stopRecording = useCallback(() => {
    _cleanup();
    if (mrRef.current && mrRef.current.state === 'recording') {
      mrRef.current.stop();          // triggers mr.onstop → onResult(blob)
    }
  }, [_cleanup]);

  // ── startRecording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (micState !== 'idle') return;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;   // mic denied — stay idle
    }

    // ── AudioContext for VAD ────────────────────────────────────────────────
    const ac      = new (window.AudioContext || window.webkitAudioContext)();
    acRef.current = ac;
    const source   = ac.createMediaStreamSource(stream);
    const analyser = ac.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    startedAt.current    = Date.now();
    silenceStart.current = null;

    const tick = () => {
      analyser.getByteTimeDomainData(buf);

      // RMS amplitude
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const x = (buf[i] - 128) / 128;
        sum += x * x;
      }
      const rms = Math.sqrt(sum / buf.length);
      setAudioLevel(Math.min(1, rms * 10));

      const elapsed = Date.now() - startedAt.current;
      const isSilent = rms < threshold;

      if (elapsed < MIN_RECORDING_MS) {
        // Too early — keep going regardless
        setMicState('listening');
        silenceStart.current = null;
      } else if (isSilent) {
        if (!silenceStart.current) {
          silenceStart.current = Date.now();
          setMicState('silence');
        } else if (Date.now() - silenceStart.current >= silenceMs) {
          // Auto-stop after sustained silence
          stopRecording();
          return;
        }
      } else {
        silenceStart.current = null;
        setMicState('listening');
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    // ── MediaRecorder ───────────────────────────────────────────────────────
    // Prefer webm; fall back to browser default
    const mime = MediaRecorder.isTypeSupported(mimeType) ? mimeType : '';
    const mr   = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    mrRef.current   = mr;
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      _cleanup();
      setMicState('processing');
      const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
      try {
        await onResult(blob);
      } finally {
        setMicState('idle');
      }
    };

    mr.start(200);   // collect data every 200ms
    setMicState('listening');
  }, [micState, mimeType, threshold, silenceMs, onResult, _cleanup, stopRecording]);

  return { micState, audioLevel, startRecording, stopRecording };
}
