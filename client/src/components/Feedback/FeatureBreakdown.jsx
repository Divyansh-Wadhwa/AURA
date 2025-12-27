import { CheckCircle2, AlertCircle } from 'lucide-react';

const FeatureBreakdown = ({ strengths = [], improvements = [] }) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Analysis</h2>
      
      {/* Strengths */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-green-600 uppercase tracking-wider mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Strengths
        </h3>
        <ul className="space-y-2">
          {strengths.length > 0 ? (
            strengths.map((strength, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <span className="text-gray-700 text-sm">{strength}</span>
              </li>
            ))
          ) : (
            <li className="text-gray-400 text-sm">No strengths identified yet</li>
          )}
        </ul>
      </div>

      {/* Areas for Improvement */}
      <div>
        <h3 className="text-sm font-medium text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Areas for Improvement
        </h3>
        <ul className="space-y-2">
          {improvements.length > 0 ? (
            improvements.map((improvement, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                <span className="text-gray-700 text-sm">{improvement}</span>
              </li>
            ))
          ) : (
            <li className="text-gray-400 text-sm">No improvements identified</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default FeatureBreakdown;
