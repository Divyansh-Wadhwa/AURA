import { Lightbulb } from 'lucide-react';

const ImprovementTips = ({ tips = [] }) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-primary-600" />
        Actionable Tips
      </h2>
      
      <div className="space-y-4">
        {tips.length > 0 ? (
          tips.map((tip, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-lg bg-primary-50 border border-primary-200"
            >
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                {index + 1}
              </div>
              <div>
                <p className="text-gray-700">{tip}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-sm">No tips available</p>
        )}
      </div>

      <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="text-primary-600 font-medium">Pro tip:</span> Practice these suggestions in your next session to see measurable improvement.
        </p>
      </div>
    </div>
  );
};

export default ImprovementTips;
