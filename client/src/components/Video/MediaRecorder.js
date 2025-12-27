export class AudioRecorder {
  constructor(options = {}) {
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
    this.options = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000,
      timeslice: 5000,
      ...options,
    };
  }

  async start(existingStream = null) {
    try {
      this.chunks = [];

      if (existingStream) {
        this.stream = existingStream;
      } else {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const mimeType = MediaRecorder.isTypeSupported(this.options.mimeType)
        ? this.options.mimeType
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: this.options.audioBitsPerSecond,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          if (this.options.onDataAvailable) {
            this.options.onDataAvailable(event.data, this.chunks.length - 1);
          }
        }
      };

      this.mediaRecorder.onerror = (event) => {
        if (this.options.onError) {
          this.options.onError(event.error);
        }
      };

      this.mediaRecorder.start(this.options.timeslice);
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  stop() {
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          resolve(this.getBlob());
        };
        this.mediaRecorder.stop();
      } else {
        resolve(this.getBlob());
      }
    });
  }

  pause() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resume() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  getBlob() {
    if (this.chunks.length === 0) return null;
    return new Blob(this.chunks, { type: this.options.mimeType });
  }

  getChunks() {
    return this.chunks;
  }

  cleanup() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.chunks = [];
  }

  get isRecording() {
    return this.mediaRecorder?.state === 'recording';
  }

  get isPaused() {
    return this.mediaRecorder?.state === 'paused';
  }
}

export default AudioRecorder;
