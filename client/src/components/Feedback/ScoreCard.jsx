import { getScoreLevel } from '../../utils/constants';

const ScoreCard = ({ title, score, icon: Icon, color = 'primary' }) => {
  const level = getScoreLevel(score || 0);
  
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    secondary: 'from-secondary-500 to-secondary-600',
    accent: 'from-accent-500 to-accent-600',
    yellow: 'from-yellow-500 to-yellow-600',
  };

  const bgClasses = {
    primary: 'bg-primary-900/30 border-primary-700/50',
    secondary: 'bg-secondary-900/30 border-secondary-700/50',
    accent: 'bg-accent-900/30 border-accent-700/50',
    yellow: 'bg-yellow-900/30 border-yellow-700/50',
  };

  return (
    <div className={`card ${bgClasses[color]} border`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className={`text-sm font-medium ${level.color}`}>{level.label}</span>
      </div>
      <h3 className="text-dark-400 text-sm mb-1">{title}</h3>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold text-white">{score || 0}</span>
        <span className="text-dark-500 mb-1">%</span>
      </div>
      <div className="mt-3 h-2 bg-dark-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${score || 0}%` }}
        />
      </div>
    </div>
  );
};

export default ScoreCard;
