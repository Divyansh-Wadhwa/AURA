import { Lightbulb } from 'lucide-react';

const ImprovementTips = ({ tips = [] }) => {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-primary-400" />
        Actionable Tips
      </h2>
      
      <div className="space-y-4">
        {tips.length > 0 ? (
          tips.map((tip, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-lg bg-primary-900/20 border border-primary-800/30"
            >
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                {index + 1}
              </div>
              <div>
                <p className="text-dark-200">{tip}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-dark-500 text-sm">No tips available</p>
        )}
      </div>

      <div className="mt-6 p-4 rounded-lg bg-dark-800/50 border border-dark-700">
        <p className="text-sm text-dark-400">
          <span className="text-primary-400 font-medium">Pro tip:</span> Practice these suggestions in your next session to see measurable improvement in your scores.
        </p>
      </div>
    </div>
  );
};

export default ImprovementTips;
