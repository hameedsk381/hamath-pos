/**
 * Maatlaadi Bill - Voice Capture, Speech Recognition & Waveform Visualizer
 * Supports MediaRecorder audio streaming, Web Speech API fallback, and Canvas Waveform
 */

class VoiceManager {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyser = null;
    this.animationId = null;
    this.stream = null;
    this.recognition = null;
    this.isRecording = false;
    this.liveTranscript = '';
    this.startTime = 0;
    this.lastSpeechTime = 0;
    this.speechDetected = false;

    // Callbacks
    this.onStateChange = null; // 'idle' | 'listening' | 'processing' | 'error'
    this.onTranscriptUpdate = null;
    this.onAudioReady = null;
    this.onLiveAudioSegment = null; // (blob, transcript) fired live on speech pause without stopping mic
    this.onSilenceDetected = null;

    this.initSpeechRecognition();
  }

  /**
   * Initialize Web Speech API for live transcription preview
   */
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'te-IN'; // Andhra Pradesh Telugu

      this.recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        this.liveTranscript = (final + ' ' + interim).trim();
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate(this.liveTranscript);
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition warning:', event.error);
      };

      this.recognition.onend = () => {
        // Auto-restart while in continuous live listening mode
        if (this.isRecording) {
          try {
            this.recognition.start();
          } catch (e) {}
        }
      };
    }
  }

  /**
   * Play simple Web Audio feedback tones
   */
  playFeedbackSound(type = 'start') {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'start') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'stop') {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'error') {
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  }

  /**
   * Start recording with Canvas Waveform visualizer
   */
  async startRecording(canvasElement) {
    this.liveTranscript = '';
    this.audioChunks = [];
    this.startTime = Date.now();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const durationSeconds = (Date.now() - this.startTime) / 1000;
        if (this.onAudioReady) {
          this.onAudioReady(audioBlob, this.liveTranscript, durationSeconds);
        }
      };

      this.mediaRecorder.start(250);
      this.isRecording = true;
      this.playFeedbackSound('start');

      if (this.recognition) {
        try {
          this.recognition.start();
        } catch (e) {
          // Already started
        }
      }

      if (this.onStateChange) this.onStateChange('listening');

      // Setup audio analyzer for waveform
      if (canvasElement) {
        this.setupVisualizer(canvasElement);
      }

      return true;
    } catch (err) {
      console.error('Microphone access failed:', err);
      this.playFeedbackSound('error');
      if (this.onStateChange) this.onStateChange('error', 'మైక్రోఫోన్ అనుమతి అవసరం. దయచేసి మైక్ యాక్సెస్ అనుమతించండి.');
      return false;
    }
  }

  /**
   * Setup Real-time Canvas Waveform Visualizer
   */
  setupVisualizer(canvas) {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const ctx = canvas.getContext('2d');

      let speechActive = false;
      let lastSpeechTimestamp = 0;
      let pauseHandled = true;
      let lastDispatchedChunkCount = 0;

      const draw = () => {
        if (!this.isRecording) return;
        this.animationId = requestAnimationFrame(draw);

        this.analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2;
        let barHeight;
        let x = 0;
        let volumeSum = 0;

        for (let i = 0; i < bufferLength; i++) {
          volumeSum += dataArray[i];
          barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

          // Gradient color: Emerald green to turquoise/amber
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#059669'); // Emerald 600
          gradient.addColorStop(0.5, '#10b981'); // Emerald 500
          gradient.addColorStop(1, '#34d399'); // Emerald 400

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, canvas.height - barHeight, barWidth - 3, barHeight, 4);
          ctx.fill();

          x += barWidth;
        }

        // Voice Activity Detection (VAD)
        const avgVolume = volumeSum / bufferLength;
        const now = Date.now();

        if (avgVolume > 11) { // User is actively speaking
          speechActive = true;
          lastSpeechTimestamp = now;
          pauseHandled = false;
        } else if (speechActive && !pauseHandled && (now - lastSpeechTimestamp > 850)) {
          // 850ms of silence after speaking! Auto-trigger live speech recognition & processing!
          pauseHandled = true;
          speechActive = false;

          if (this.audioChunks.length > 0 && this.audioChunks.length !== lastDispatchedChunkCount) {
            lastDispatchedChunkCount = this.audioChunks.length;
            const segmentBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            if (this.onLiveAudioSegment) {
              this.onLiveAudioSegment(segmentBlob, this.liveTranscript);
            }
          }

          if (this.onSilenceDetected) {
            this.onSilenceDetected();
          }
        }
      };

      draw();
    } catch (e) {
      console.warn('Waveform visualization init error:', e);
    }
  }

  /**
   * Get snapshot of audio recorded so far
   */
  getAudioSnapshot() {
    if (this.audioChunks && this.audioChunks.length > 0) {
      return new Blob(this.audioChunks, { type: 'audio/webm' });
    }
    return null;
  }

  /**
   * Stop recording & trigger processing
   */
  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.playFeedbackSound('stop');

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    if (this.onStateChange) this.onStateChange('processing');
  }

  /**
   * Cancel recording without processing
   */
  cancelRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }

    this.audioChunks = [];
    if (this.onStateChange) this.onStateChange('idle');
  }
}

window.VoiceManager = new VoiceManager();
