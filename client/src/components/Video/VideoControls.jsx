import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Camera } from 'lucide-react';

const VideoControls = ({
  isAudioEnabled,
  isVideoEnabled,
  isLiveMode,
  videoModeEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  isEnding,
}) => {
  return (
    <div className="p-4 bg-dark-900 border-t border-dark-800">
      <div className="flex items-center justify-center gap-4">
        {/* Mute Button */}
        <button
          onClick={onToggleAudio}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isAudioEnabled
              ? 'bg-dark-700 hover:bg-dark-600 text-white'
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </button>

        {/* Video Enable/Disable Button - Only in Live Mode */}
        {isLiveMode && (
          <button
            onClick={onToggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              videoModeEnabled
                ? 'bg-primary-600 hover:bg-primary-500 text-white'
                : 'bg-dark-700 hover:bg-dark-600 text-white'
            }`}
            title={videoModeEnabled ? 'Disable video' : 'Enable video'}
          >
            {videoModeEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>
        )}

      </div>
    </div>
  );
};

export default VideoControls;
