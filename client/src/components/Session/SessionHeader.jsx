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
    <header className="sticky top-0 z-50 glass border-b border-dark-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white hidden sm:inline">A.U.R.A</span>
            </Link>
            <div className="h-6 w-px bg-dark-700" />
            <div className="flex items-center gap-2">
              <span className="badge-primary">
                {SCENARIO_LABELS[scenario] || scenario}
              </span>
              <span className="badge-secondary flex items-center gap-1">
                <ModeIcon className="w-3 h-3" />
                {INTERACTION_MODE_LABELS[interactionMode]}
              </span>
            </div>
          </div>

          <button
            onClick={onEnd}
            disabled={isEnding}
            className="btn-danger btn-sm flex items-center gap-2"
          >
            {isEnding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <PhoneOff className="w-4 h-4" />
                <span className="hidden sm:inline">End Interview</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default SessionHeader;
