import { CheckCircle2, AlertCircle } from 'lucide-react';

const FeatureBreakdown = ({ strengths = [], improvements = [] }) => {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-6">Performance Analysis</h2>
      
      {/* Strengths */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-accent-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Strengths
        </h3>
        <ul className="space-y-2">
          {strengths.length > 0 ? (
            strengths.map((strength, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-accent-900/20 border border-accent-800/30"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-accent-400 mt-2 flex-shrink-0" />
                <span className="text-dark-200 text-sm">{strength}</span>
              </li>
            ))
          ) : (
            <li className="text-dark-500 text-sm">No strengths identified yet</li>
          )}
        </ul>
      </div>

      {/* Areas for Improvement */}
      <div>
        <h3 className="text-sm font-medium text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Areas for Improvement
        </h3>
        <ul className="space-y-2">
          {improvements.length > 0 ? (
            improvements.map((improvement, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-yellow-900/20 border border-yellow-800/30"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 flex-shrink-0" />
                <span className="text-dark-200 text-sm">{improvement}</span>
              </li>
            ))
          ) : (
            <li className="text-dark-500 text-sm">No improvements identified</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default FeatureBreakdown;
