(function initPrimeBodyTechniqueRecorder(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PrimeBodyTechniqueRecorder = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createTechniqueRecorderApi() {
  'use strict';

  const MAX_DURATION_MS = 90_000;
  const MIME_TYPES = Object.freeze([
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]);

  function pickMimeType(MediaRecorderClass) {
    if (!MediaRecorderClass || typeof MediaRecorderClass.isTypeSupported !== 'function') return '';
    return MIME_TYPES.find(type => MediaRecorderClass.isTypeSupported(type)) || '';
  }

  function fitCompositeSize(sourceWidth, sourceHeight, maxEdge = 1280) {
    const width = Math.max(2, Number(sourceWidth) || 2);
    const height = Math.max(2, Number(sourceHeight) || 2);
    const scale = Math.min(1, Math.max(2, Number(maxEdge) || 1280) / Math.max(width, height));
    return {
      width: Math.max(2, Math.floor(width * scale / 2) * 2),
      height: Math.max(2, Math.floor(height * scale / 2) * 2),
    };
  }

  function recordingFilename(exerciseName, date = new Date(), mimeType = 'video/webm') {
    const slug = String(exerciseName || 'technique')
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 54) || 'technique';
    const pad = value => String(value).padStart(2, '0');
    const stamp = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
    const extension = /mp4/i.test(mimeType) ? 'mp4' : 'webm';
    return `primebody-${slug}-${stamp}.${extension}`;
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
        if (lines.length === maxLines - 1) break;
      } else {
        line = candidate;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    lines.forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
    return lines.length;
  }

  function create(options = {}) {
    const video = options.video;
    const overlayCanvas = options.overlayCanvas;
    const documentRef = options.documentRef || (typeof document !== 'undefined' ? document : null);
    const MediaRecorderClass = options.MediaRecorderClass || (typeof MediaRecorder !== 'undefined' ? MediaRecorder : null);
    const requestFrame = options.requestFrame || (typeof requestAnimationFrame === 'function' ? requestAnimationFrame.bind(globalThis) : callback => setTimeout(callback, 33));
    const cancelFrame = options.cancelFrame || (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame.bind(globalThis) : clearTimeout);
    const setTimer = options.setTimer || setTimeout;
    const clearTimer = options.clearTimer || clearTimeout;
    const now = options.now || (() => Date.now());
    const canvas = options.canvas || documentRef?.createElement?.('canvas') || null;
    const ctx = canvas?.getContext?.('2d') || null;
    let recorder = null;
    let captureStream = null;
    let chunks = [];
    let frameId = 0;
    let stopTimer = 0;
    let startedAt = 0;
    let stopResolver = null;
    let lastResult = null;

    function isSupported() {
      return Boolean(video && overlayCanvas && canvas && ctx && MediaRecorderClass && typeof canvas.captureStream === 'function');
    }

    function drawFrame() {
      if (!video?.videoWidth || !video?.videoHeight || !ctx || !canvas) return false;
      const size = fitCompositeSize(video.videoWidth, video.videoHeight, options.maxEdge || 1280);
      if (canvas.width !== size.width || canvas.height !== size.height) {
        canvas.width = size.width;
        canvas.height = size.height;
      }
      const width = canvas.width;
      const height = canvas.height;
      ctx.save();
      ctx.fillStyle = '#090806';
      ctx.fillRect(0, 0, width, height);
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      if (overlayCanvas.width && overlayCanvas.height) ctx.drawImage(overlayCanvas, 0, 0, width, height);
      ctx.restore();

      const shortEdge = Math.min(width, height);
      const panelHeight = Math.min(height, Math.max(height >= width ? 250 : 180, Math.round(height * 0.18)));
      const padding = Math.max(22, Math.round(width * 0.045));
      const panelTop = height - panelHeight;
      const gradient = ctx.createLinearGradient(0, panelTop - 36, 0, height);
      gradient.addColorStop(0, 'rgba(5,4,3,0)');
      gradient.addColorStop(0.28, 'rgba(5,4,3,.82)');
      gradient.addColorStop(1, 'rgba(5,4,3,.96)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, panelTop - 36, width, panelHeight + 36);
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#d7b08c';
      ctx.font = `800 ${Math.max(14, Math.round(shortEdge * 0.022))}px system-ui, sans-serif`;
      ctx.fillText('ПРАЙМ-ТЕЛО · ТЕХНИКА', padding, panelTop + 16);
      ctx.fillStyle = '#f5f0e9';
      const titleSize = Math.max(21, Math.round(shortEdge * 0.036));
      const titleLineHeight = Math.round(titleSize * 1.12);
      ctx.font = `800 ${titleSize}px system-ui, sans-serif`;
      const exerciseName = options.getExerciseName?.() || 'Проверка техники';
      const titleLines = drawWrappedText(ctx, exerciseName, padding, panelTop + 43, width - padding * 2, titleLineHeight, 2);
      ctx.fillStyle = '#d8cec4';
      const captionSize = Math.max(16, Math.round(shortEdge * 0.027));
      const captionLineHeight = Math.round(captionSize * 1.22);
      ctx.font = `650 ${captionSize}px system-ui, sans-serif`;
      const captionY = panelTop + 47 + titleLines * titleLineHeight + 5;
      drawWrappedText(ctx, options.getCaption?.() || 'Сохраняй устойчивое положение', padding, captionY, width - padding * 2, captionLineHeight, 2);
      return true;
    }

    function animationLoop() {
      if (!recorder || recorder.state === 'inactive') return;
      drawFrame();
      frameId = requestFrame(animationLoop);
    }

    function finishResult() {
      if (frameId) cancelFrame(frameId);
      if (stopTimer) clearTimer(stopTimer);
      captureStream?.getTracks?.().forEach(track => track.stop());
      const mimeType = recorder?.mimeType || pickMimeType(MediaRecorderClass) || 'video/webm';
      const blob = new Blob(chunks, { type: mimeType });
      lastResult = {
        blob,
        mimeType,
        durationMs: Math.min(MAX_DURATION_MS, Math.max(0, now() - startedAt)),
        filename: recordingFilename(options.getExerciseName?.(), new Date(), mimeType),
      };
      chunks = [];
      recorder = null;
      captureStream = null;
      options.onState?.('ready', lastResult);
      options.onComplete?.(lastResult);
      stopResolver?.(lastResult);
      stopResolver = null;
    }

    function start() {
      if (!isSupported()) throw new Error('TECHNIQUE_RECORDING_UNSUPPORTED');
      if (recorder && recorder.state !== 'inactive') return false;
      if (!drawFrame()) throw new Error('TECHNIQUE_CAMERA_NOT_READY');
      chunks = [];
      lastResult = null;
      captureStream = canvas.captureStream(options.frameRate || 30);
      const mimeType = pickMimeType(MediaRecorderClass);
      const recorderOptions = { videoBitsPerSecond: options.videoBitsPerSecond || 3_500_000 };
      if (mimeType) recorderOptions.mimeType = mimeType;
      recorder = new MediaRecorderClass(captureStream, recorderOptions);
      recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
      recorder.onerror = event => options.onError?.(event.error || event);
      recorder.onstop = finishResult;
      startedAt = now();
      recorder.start(250);
      options.onState?.('recording');
      frameId = requestFrame(animationLoop);
      stopTimer = setTimer(() => { stop(); }, MAX_DURATION_MS);
      return true;
    }

    function stop() {
      if (!recorder || recorder.state === 'inactive') return Promise.resolve(lastResult);
      return new Promise(resolve => {
        stopResolver = resolve;
        recorder.stop();
      });
    }

    function dispose() {
      if (frameId) cancelFrame(frameId);
      if (stopTimer) clearTimer(stopTimer);
      if (recorder && recorder.state !== 'inactive') {
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        recorder.stop();
      }
      captureStream?.getTracks?.().forEach(track => track.stop());
      recorder = null;
      captureStream = null;
      chunks = [];
    }

    return Object.freeze({
      isSupported,
      isRecording: () => Boolean(recorder && recorder.state !== 'inactive'),
      drawFrame,
      start,
      stop,
      dispose,
      canvas,
    });
  }

  return Object.freeze({
    MAX_DURATION_MS,
    pickMimeType,
    recordingFilename,
    fitCompositeSize,
    create,
  });
}));
