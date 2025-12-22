import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SkillIndicator = ({ skill, value, trend = 'neutral', showLabel = true }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-accent-400" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-400" />;
      default:
        return <Minus className="w-3 h-3 text-dark-400" />;
    }
  };

  const getColor = () => {
    if (value >= 70) return 'bg-accent-500';
    if (value >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-xs text-dark-400 capitalize w-20">{skill}</span>
      )}
      <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} rounded-full transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="flex items-center gap-1 min-w-[40px] justify-end">
        <span className="text-xs text-white font-medium">{value}%</span>
        {getTrendIcon()}
      </div>
    </div>
  );
};

export default SkillIndicator;
