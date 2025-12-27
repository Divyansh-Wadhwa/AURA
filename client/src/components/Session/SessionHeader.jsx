import { Link } from 'react-router-dom';
import { Sparkles, PhoneOff, Loader2, Video, Mic, MessageSquare } from 'lucide-react';
import { SCENARIO_LABELS, INTERACTION_MODE_LABELS, INTERACTION_MODES } from '../../utils/constants';

const SessionHeader = ({ scenario, interactionMode, onEnd, isEnding }) => {
  const getModeIcon = () => {
    switch (interactionMode) {
      case INTERACTION_MODES.AUDIO_VIDEO:
        return Video;
      case INTERACTION_MODES.AUDIO_ONLY:
        return Mic;
      default:
        return MessageSquare;
    }
  };

  const ModeIcon = getModeIcon();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 hidden sm:inline">AURA</span>
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                {SCENARIO_LABELS[scenario] || scenario}
              </span>
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
                <ModeIcon className="w-3 h-3" />
                {INTERACTION_MODE_LABELS[interactionMode]}
              </span>
            </div>
          </div>

          <button
            onClick={onEnd}
            disabled={isEnding}
            className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isEnding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <PhoneOff className="w-4 h-4" />
                <span className="hidden sm:inline">End Session</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default SessionHeader;
