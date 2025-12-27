import { Clock } from 'lucide-react';

const SessionTimer = ({ elapsed, formatted }) => {
  const getTimeColor = () => {
    if (elapsed < 300) return 'text-accent-400'; // Under 5 min - green
    if (elapsed < 600) return 'text-yellow-400'; // Under 10 min - yellow
    return 'text-red-400'; // Over 10 min - red
  };

  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800/80 backdrop-blur-sm border border-dark-700">
      <Clock className={`w-4 h-4 ${getTimeColor()}`} />
      <span className={`font-mono font-medium ${getTimeColor()}`}>{formatted}</span>
    </div>
  );
};

export default SessionTimer;
