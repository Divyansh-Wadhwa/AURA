import { Mic, Loader2 } from 'lucide-react';

const TranscriptionDisplay = ({ isRecording, isTranscribing, transcriptionText, chunkCount = 0, audioSize = 0 }) => {
  if (!isRecording && !isTranscribing && !transcriptionText) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full px-4">
      <div className="bg-dark-800 border border-dark-700 rounded-xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className="flex-shrink-0 mt-1">
            {isRecording ? (
              <div className="relative">
                <Mic className="w-5 h-5 text-red-500" />
                <div className="absolute inset-0 animate-ping">
                  <Mic className="w-5 h-5 text-red-500 opacity-75" />
                </div>
              </div>
            ) : isTranscribing ? (
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-green-500" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Status Text */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-dark-300">
                {isRecording && 'Recording...'}
                {isTranscribing && 'Transcribing...'}
                {!isRecording && !isTranscribing && transcriptionText && 'Transcription Complete'}
              </span>
              {isRecording && (
                <span className="text-xs text-dark-500">
                  Click mic to stop
                </span>
              )}
            </div>

            {/* Transcription Text */}
            {transcriptionText && (
              <div className="bg-dark-900 rounded-lg p-3 border border-dark-700">
                <p className="text-sm text-dark-100 leading-relaxed">
                  {transcriptionText}
                </p>
              </div>
            )}

            {/* Recording Indicator */}
            {isRecording && !transcriptionText && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-dark-400">Speak now...</span>
                </div>
                {/* Real-time chunk info */}
                <div className="text-xs text-dark-500 font-mono">
                  Chunks: {chunkCount} | Size: {(audioSize / 1024).toFixed(1)} KB
                </div>
              </div>
            )}

            {/* Transcribing Indicator */}
            {isTranscribing && !transcriptionText && (
              <div className="text-xs text-dark-400">
                Converting speech to text...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionDisplay;
