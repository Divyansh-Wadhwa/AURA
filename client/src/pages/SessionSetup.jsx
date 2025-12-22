import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Video,
  Mic,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  MicOff,
  VideoOff,
} from 'lucide-react';
import {
  SCENARIOS,
  SCENARIO_LABELS,
  SCENARIO_DESCRIPTIONS,
  SKILLS,
  SKILL_LABELS,
  SKILL_DESCRIPTIONS,
  INTERACTION_MODES,
  INTERACTION_MODE_LABELS,
  INTERACTION_MODE_DESCRIPTIONS,
} from '../utils/constants';

const SessionSetup = () => {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    scenario: SCENARIOS.GENERAL_PRACTICE,
    interactionMode: INTERACTION_MODES.TEXT_ONLY,
    skillFocus: [SKILLS.CONFIDENCE, SKILLS.CLARITY],
  });
  const [permissions, setPermissions] = useState({
    camera: null,
    microphone: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { startSession } = useSession();
  const navigate = useNavigate();

  const checkPermissions = async () => {
    if (config.interactionMode === INTERACTION_MODES.TEXT_ONLY) {
      return true;
    }

    try {
      const constraints = {
        audio: true,
        video: config.interactionMode === INTERACTION_MODES.AUDIO_VIDEO,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setPermissions({
        camera: config.interactionMode === INTERACTION_MODES.AUDIO_VIDEO ? true : null,
        microphone: true,
      });

      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      setPermissions({
        camera: config.interactionMode === INTERACTION_MODES.AUDIO_VIDEO ? false : null,
        microphone: false,
      });
      return false;
    }
  };

  useEffect(() => {
    if (step === 3 && config.interactionMode !== INTERACTION_MODES.TEXT_ONLY) {
      checkPermissions();
    }
  }, [step, config.interactionMode]);

  const handleScenarioSelect = (scenario) => {
    setConfig({ ...config, scenario });
  };

  const handleModeSelect = (mode) => {
    setConfig({ ...config, interactionMode: mode });
    setPermissions({ camera: null, microphone: null });
  };

  const handleSkillToggle = (skill) => {
    const skills = config.skillFocus.includes(skill)
      ? config.skillFocus.filter((s) => s !== skill)
      : [...config.skillFocus, skill];
    
    if (skills.length > 0) {
      setConfig({ ...config, skillFocus: skills });
    }
  };

  const handleStartSession = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await startSession(config);
      
      if (result.success) {
        navigate(`/session/${result.data.sessionId}`);
      } else {
        setError(result.error || 'Failed to start session');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 3 && config.interactionMode !== INTERACTION_MODES.TEXT_ONLY) {
      return permissions.microphone === true;
    }
    return true;
  };

  const interactionModeIcons = {
    [INTERACTION_MODES.TEXT_ONLY]: MessageSquare,
    [INTERACTION_MODES.AUDIO_ONLY]: Mic,
    [INTERACTION_MODES.AUDIO_VIDEO]: Video,
  };

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-dark-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">A.U.R.A</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  s === step
                    ? 'bg-primary-600 text-white'
                    : s < step
                    ? 'bg-accent-600 text-white'
                    : 'bg-dark-800 text-dark-400'
                }`}
              >
                {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 rounded ${s < step ? 'bg-accent-600' : 'bg-dark-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Scenario */}
        {step === 1 && (
          <div className="animate-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Choose Interview Scenario</h1>
              <p className="text-dark-400">Select the type of interview you want to practice</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {Object.values(SCENARIOS).map((scenario) => (
                <button
                  key={scenario}
                  onClick={() => handleScenarioSelect(scenario)}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    config.scenario === scenario
                      ? 'border-primary-500 bg-primary-900/20'
                      : 'border-dark-700 bg-dark-900 hover:border-dark-600'
                  }`}
                >
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {SCENARIO_LABELS[scenario]}
                  </h3>
                  <p className="text-dark-400 text-sm">{SCENARIO_DESCRIPTIONS[scenario]}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Mode & Skills */}
        {step === 2 && (
          <div className="animate-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Configure Your Session</h1>
              <p className="text-dark-400">Choose interaction mode and skills to focus on</p>
            </div>

            {/* Interaction Mode */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Interaction Mode</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {Object.values(INTERACTION_MODES).map((mode) => {
                  const Icon = interactionModeIcons[mode];
                  return (
                    <button
                      key={mode}
                      onClick={() => handleModeSelect(mode)}
                      className={`p-6 rounded-xl border-2 text-center transition-all ${
                        config.interactionMode === mode
                          ? 'border-primary-500 bg-primary-900/20'
                          : 'border-dark-700 bg-dark-900 hover:border-dark-600'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                        config.interactionMode === mode ? 'bg-primary-600' : 'bg-dark-800'
                      }`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-1">
                        {INTERACTION_MODE_LABELS[mode]}
                      </h3>
                      <p className="text-dark-400 text-sm">{INTERACTION_MODE_DESCRIPTIONS[mode]}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skill Focus */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Skills to Focus On</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.values(SKILLS).map((skill) => (
                  <button
                    key={skill}
                    onClick={() => handleSkillToggle(skill)}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${
                      config.skillFocus.includes(skill)
                        ? 'border-accent-500 bg-accent-900/20'
                        : 'border-dark-700 bg-dark-900 hover:border-dark-600'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                      config.skillFocus.includes(skill) ? 'bg-accent-600' : 'bg-dark-700'
                    }`}>
                      {config.skillFocus.includes(skill) && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{SKILL_LABELS[skill]}</h3>
                      <p className="text-dark-400 text-sm">{SKILL_DESCRIPTIONS[skill]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Permissions & Start */}
        {step === 3 && (
          <div className="animate-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Ready to Start</h1>
              <p className="text-dark-400">
                {config.interactionMode === INTERACTION_MODES.TEXT_ONLY
                  ? 'Review your settings and start the interview'
                  : 'Grant permissions and start the interview'}
              </p>
            </div>

            {/* Session Summary */}
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Session Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark-400">Scenario</span>
                  <span className="text-white">{SCENARIO_LABELS[config.scenario]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Mode</span>
                  <span className="text-white">{INTERACTION_MODE_LABELS[config.interactionMode]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Focus Skills</span>
                  <span className="text-white">
                    {config.skillFocus.map((s) => SKILL_LABELS[s]).join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Permissions Check */}
            {config.interactionMode !== INTERACTION_MODES.TEXT_ONLY && (
              <div className="card mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Device Permissions</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {permissions.microphone === true ? (
                        <Mic className="w-5 h-5 text-accent-400" />
                      ) : permissions.microphone === false ? (
                        <MicOff className="w-5 h-5 text-red-400" />
                      ) : (
                        <Mic className="w-5 h-5 text-dark-400" />
                      )}
                      <span className="text-white">Microphone</span>
                    </div>
                    <span className={`badge ${
                      permissions.microphone === true ? 'badge-success' :
                      permissions.microphone === false ? 'badge-error' :
                      'badge-warning'
                    }`}>
                      {permissions.microphone === true ? 'Granted' :
                       permissions.microphone === false ? 'Denied' :
                       'Checking...'}
                    </span>
                  </div>

                  {config.interactionMode === INTERACTION_MODES.AUDIO_VIDEO && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {permissions.camera === true ? (
                          <Camera className="w-5 h-5 text-accent-400" />
                        ) : permissions.camera === false ? (
                          <VideoOff className="w-5 h-5 text-red-400" />
                        ) : (
                          <Camera className="w-5 h-5 text-dark-400" />
                        )}
                        <span className="text-white">Camera</span>
                      </div>
                      <span className={`badge ${
                        permissions.camera === true ? 'badge-success' :
                        permissions.camera === false ? 'badge-error' :
                        'badge-warning'
                      }`}>
                        {permissions.camera === true ? 'Granted' :
                         permissions.camera === false ? 'Denied' :
                         'Checking...'}
                      </span>
                    </div>
                  )}
                </div>

                {(permissions.microphone === false || permissions.camera === false) && (
                  <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-700/50 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 font-medium">Permission Required</p>
                      <p className="text-red-400 text-sm">
                        Please allow access to your microphone{config.interactionMode === INTERACTION_MODES.AUDIO_VIDEO ? ' and camera' : ''} to continue.
                      </p>
                      <button
                        onClick={checkPermissions}
                        className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="btn-outline flex items-center gap-2 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="btn-primary flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleStartSession}
              disabled={loading || !canProceed()}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Start Interview
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default SessionSetup;
