import { useRef, useEffect } from 'react';
import { User, VideoOff } from 'lucide-react';

const VideoCall = ({ localStream, remoteStream, isVideoEnabled }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="relative h-full bg-dark-900">
      {/* Main Video (Remote or Placeholder) */}
      <div className="absolute inset-0 flex items-center justify-center">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center mx-auto mb-4">
              <User className="w-16 h-16 text-white" />
            </div>
            <p className="text-white font-medium">AI Interviewer</p>
            <p className="text-dark-400 text-sm">Waiting for connection...</p>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <div className="absolute bottom-4 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-dark-700 shadow-xl">
        {isVideoEnabled && localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
        ) : (
          <div className="w-full h-full bg-dark-800 flex items-center justify-center">
            {isVideoEnabled ? (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            ) : (
              <div className="text-center">
                <VideoOff className="w-8 h-8 text-dark-500 mx-auto mb-1" />
                <span className="text-dark-500 text-xs">Camera Off</span>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};

export default VideoCall;
