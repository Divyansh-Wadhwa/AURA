/**
 * Behavioral Timeline Component
 * ==============================
 * Displays a visual timeline of behavioral events detected during the interview.
 * Shows where the user had issues with eye contact, posture, engagement, etc.
 */
import { useState } from 'react';
import {
  Eye,
  EyeOff,
  UserX,
  Activity,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
} from 'lucide-react';

// Event type configurations
const EVENT_CONFIG = {
  eye_contact_lost: {
    icon: EyeOff,
    label: 'Eye Contact Lost',
    color: 'yellow',
    tip: 'Try to maintain eye contact with the camera to appear more engaged and confident.'
  },
  face_not_visible: {
    icon: UserX,
    label: 'Face Not Visible',
    color: 'red',
    tip: 'Keep your face visible in the frame throughout the interview.'
  },
  excessive_movement: {
    icon: Activity,
    label: 'Excessive Movement',
    color: 'orange',
    tip: 'Try to minimize fidgeting and excessive head movement to appear more composed.'
  },
  closed_posture: {
    icon: AlertTriangle,
    label: 'Closed Posture',
    color: 'blue',
    tip: 'Open up your posture - keep shoulders back and avoid crossing arms.'
  },
  low_engagement: {
    icon: TrendingUp,
    label: 'Low Engagement',
    color: 'purple',
    tip: 'Show more facial expressions and reactions to appear more engaged.'
  }
};

// Format time from milliseconds to MM:SS
const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Get color classes based on event type
const getColorClasses = (color, severity) => {
  const colors = {
    yellow: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      icon: 'text-yellow-400',
      dot: 'bg-yellow-500'
    },
    red: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      text: 'text-red-400',
      icon: 'text-red-400',
      dot: 'bg-red-500'
    },
    orange: {
      bg: 'bg-orange-500/20',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      icon: 'text-orange-400',
      dot: 'bg-orange-500'
    },
    blue: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      icon: 'text-blue-400',
      dot: 'bg-blue-500'
    },
    purple: {
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      icon: 'text-purple-400',
      dot: 'bg-purple-500'
    }
  };
  return colors[color] || colors.yellow;
};

const BehavioralTimeline = ({ timeline, sessionDuration }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!timeline || !timeline.events || timeline.events.length === 0) {
    return (
      <div className="rounded-2xl bg-dark-800 border border-dark-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Eye className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Behavioral Analysis</h3>
            <p className="text-sm text-dark-400">No significant issues detected</p>
          </div>
        </div>
        <p className="text-dark-300 text-sm">
          Great job! Your body language and engagement were consistent throughout the interview.
        </p>
      </div>
    );
  }

  const { events, summary } = timeline;
  const displayEvents = expanded ? events : events.slice(0, 3);
  const hasMore = events.length > 3;

  return (
    <div className="rounded-2xl bg-dark-800 border border-dark-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Behavioral Timeline</h3>
              <p className="text-sm text-dark-400">
                {summary.totalEvents} moment{summary.totalEvents !== 1 ? 's' : ''} to improve
              </p>
            </div>
          </div>
          
          {/* Summary badges */}
          <div className="flex gap-2">
            {summary.criticalCount > 0 && (
              <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                {summary.criticalCount} critical
              </span>
            )}
            {summary.warningCount > 0 && (
              <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                {summary.warningCount} warning
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline visualization bar */}
      {sessionDuration > 0 && (
        <div className="px-6 py-4 border-b border-dark-700 bg-dark-850">
          <div className="flex items-center gap-2 text-xs text-dark-400 mb-2">
            <span>0:00</span>
            <div className="flex-1 text-center">Interview Timeline</div>
            <span>{formatTime(sessionDuration)}</span>
          </div>
          <div className="relative h-6 bg-dark-700 rounded-full overflow-hidden">
            {events.map((event, idx) => {
              const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.eye_contact_lost;
              const colors = getColorClasses(config.color);
              const startPercent = (event.startTime / sessionDuration) * 100;
              const widthPercent = Math.max((event.duration / sessionDuration) * 100, 1);
              
              return (
                <div
                  key={idx}
                  className={`absolute top-0 h-full ${colors.bg} border-l-2 ${colors.border}`}
                  style={{
                    left: `${startPercent}%`,
                    width: `${widthPercent}%`,
                    minWidth: '4px'
                  }}
                  title={`${config.label} at ${formatTime(event.startTime)}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Event list */}
      <div className="p-4 space-y-3">
        {displayEvents.map((event, idx) => {
          const config = EVENT_CONFIG[event.type] || {
            icon: Info,
            label: event.type,
            color: 'yellow',
            tip: ''
          };
          const colors = getColorClasses(config.color, event.severity);
          const Icon = config.icon;

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg ${colors.bg} border ${colors.border}`}
            >
              <div className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-medium ${colors.text}`}>{config.label}</span>
                  <span className="text-dark-400 text-xs">
                    at {formatTime(event.startTime)}
                  </span>
                  {event.severity === 'critical' && (
                    <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-red-400 text-xs">
                      Critical
                    </span>
                  )}
                </div>
                <p className="text-sm text-dark-300">{event.message}</p>
                {config.tip && (
                  <p className="text-xs text-dark-400 mt-1">
                    💡 {config.tip}
                  </p>
                )}
              </div>
              <div className="text-xs text-dark-500 flex-shrink-0">
                {Math.round(event.duration / 1000)}s
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more/less button */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 border-t border-dark-700 flex items-center justify-center gap-2 text-dark-400 hover:text-white hover:bg-dark-750 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show {events.length - 3} more events
            </>
          )}
        </button>
      )}

      {/* Summary stats */}
      {summary.totalEvents > 0 && (
        <div className="px-6 py-4 border-t border-dark-700 bg-dark-850">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-white">{summary.eyeContactIssues}</div>
              <div className="text-xs text-dark-400">Eye Contact</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{summary.postureIssues + summary.movementIssues}</div>
              <div className="text-xs text-dark-400">Body Language</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{summary.engagementIssues}</div>
              <div className="text-xs text-dark-400">Engagement</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BehavioralTimeline;
