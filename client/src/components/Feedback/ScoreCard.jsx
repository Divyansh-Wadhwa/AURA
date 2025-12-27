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
    primary: 'bg-primary-50 border-primary-200',
    secondary: 'bg-secondary-50 border-secondary-200',
    accent: 'bg-accent-50 border-accent-200',
    yellow: 'bg-yellow-50 border-yellow-200',
  };

  const iconBgClasses = {
    primary: 'bg-primary-100',
    secondary: 'bg-secondary-100',
    accent: 'bg-accent-100',
    yellow: 'bg-yellow-100',
  };

  const iconColorClasses = {
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    accent: 'text-accent-600',
    yellow: 'text-yellow-600',
  };

  return (
    <div className={`bg-white rounded-xl p-5 border border-gray-200 shadow-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg ${iconBgClasses[color]} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColorClasses[color]}`} />
        </div>
        <span className="text-sm font-medium text-gray-500">{level.label}</span>
      </div>
      <h3 className="text-gray-500 text-sm mb-1">{title}</h3>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold text-gray-900">{score || 0}</span>
        <span className="text-gray-400 mb-1">%</span>
      </div>
      <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${score || 0}%` }}
        />
      </div>
    </div>
  );
};

export default ScoreCard;
