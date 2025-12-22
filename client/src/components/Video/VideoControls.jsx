import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from 'lucide-react';

const VideoControls = ({
  isAudioEnabled,
  isVideoEnabled,
  isVideoMode,
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

        {/* Video Toggle Button */}
        {isVideoMode && (
          <button
            onClick={onToggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isVideoEnabled
                ? 'bg-dark-700 hover:bg-dark-600 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </button>
        )}

        {/* End Call Button */}
        <button
          onClick={onEndCall}
          disabled={isEnding}
          className="w-14 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors disabled:opacity-50"
          title="End Interview"
        >
          {isEnding ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <PhoneOff className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default VideoControls;
