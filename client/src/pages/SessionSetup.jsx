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
  Upload,
  FileText,
  X,
  Wand2,
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
    customContext: {
      prompt: '',
      resumeFile: null,
      resumeText: '',
      jobDescriptionFile: null,
      jobDescriptionText: '',
    },
  });
  const [permissions, setPermissions] = useState({
    camera: null,
    microphone: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingFile, setUploadingFile] = useState(null);

  const { startSession } = useSession();
  const navigate = useNavigate();

  const checkPermissions = async () => {
    if (config.interactionMode === INTERACTION_MODES.TEXT_ONLY) {
      return true;
    }

    try {
      const constraints = {
        audio: true,
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setPermissions({
        camera: null,
        microphone: true,
      });

      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      setPermissions({
        camera: null,
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

  // Handle file upload and extract text
  const handleFileUpload = async (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, TXT, or Word document');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploadingFile(fileType);
    setError('');

    try {
      // Read file content
      const text = await extractTextFromFile(file);
      
      if (fileType === 'resume') {
        setConfig(prev => ({
          ...prev,
          customContext: {
            ...prev.customContext,
            resumeFile: file,
            resumeText: text,
          },
        }));
      } else {
        setConfig(prev => ({
          ...prev,
          customContext: {
            ...prev.customContext,
            jobDescriptionFile: file,
            jobDescriptionText: text,
          },
        }));
      }
    } catch (err) {
      setError('Failed to read file. Please try again.');
    } finally {
      setUploadingFile(null);
    }
  };

  // Extract text from uploaded file
  const extractTextFromFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (file.type === 'text/plain') {
          resolve(e.target.result);
        } else {
          // For PDF/Word, we'll send the raw content and let server handle extraction
          // For now, just read as text (basic support)
          resolve(e.target.result);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Remove uploaded file
  const removeFile = (fileType) => {
    if (fileType === 'resume') {
      setConfig(prev => ({
        ...prev,
        customContext: {
          ...prev.customContext,
          resumeFile: null,
          resumeText: '',
        },
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        customContext: {
          ...prev.customContext,
          jobDescriptionFile: null,
          jobDescriptionText: '',
        },
      }));
    }
  };

  // Update custom prompt
  const handleCustomPromptChange = (e) => {
    setConfig(prev => ({
      ...prev,
      customContext: {
        ...prev.customContext,
        prompt: e.target.value,
      },
    }));
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
      // Prepare config for API (don't send File objects, only text content)
      const sessionConfig = {
        scenario: config.scenario,
        interactionMode: config.interactionMode,
        skillFocus: config.skillFocus,
      };

      // Include custom context if scenario is custom
      if (config.scenario === SCENARIOS.CUSTOM) {
        sessionConfig.customContext = {
          prompt: config.customContext.prompt,
          resumeText: config.customContext.resumeText,
          jobDescriptionText: config.customContext.jobDescriptionText,
        };
      }

      const result = await startSession(sessionConfig);
      
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
    [INTERACTION_MODES.LIVE]: Mic,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">AURA</span>
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
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 rounded ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Scenario */}
        {step === 1 && (
          <div className="animate-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose Practice Scenario</h1>
              <p className="text-gray-500">Select the type of practice you want to focus on</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {Object.values(SCENARIOS).filter(s => s !== SCENARIOS.CUSTOM).map((scenario) => (
                <button
                  key={scenario}
                  onClick={() => handleScenarioSelect(scenario)}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    config.scenario === scenario
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {SCENARIO_LABELS[scenario]}
                  </h3>
                  <p className="text-gray-500 text-sm">{SCENARIO_DESCRIPTIONS[scenario]}</p>
                </button>
              ))}
            </div>

            {/* Custom Interview Option */}
            <div className="mt-6">
              <button
                onClick={() => handleScenarioSelect(SCENARIOS.CUSTOM)}
                className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                  config.scenario === SCENARIOS.CUSTOM
                    ? 'border-secondary-500 bg-secondary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    config.scenario === SCENARIOS.CUSTOM ? 'bg-secondary-600' : 'bg-gray-100'
                  }`}>
                    <Wand2 className={`w-6 h-6 ${config.scenario === SCENARIOS.CUSTOM ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {SCENARIO_LABELS[SCENARIOS.CUSTOM]}
                    </h3>
                    <p className="text-gray-500 text-sm">{SCENARIO_DESCRIPTIONS[SCENARIOS.CUSTOM]}</p>
                  </div>
                </div>
              </button>

              {/* Custom Interview Configuration */}
              {config.scenario === SCENARIOS.CUSTOM && (
                <div className="mt-4 p-6 bg-white rounded-xl border border-gray-200 space-y-6">
                  {/* Custom Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interview Focus / Custom Prompt
                    </label>
                    <textarea
                      value={config.customContext.prompt}
                      onChange={handleCustomPromptChange}
                      placeholder="e.g., DSA Interview focusing on arrays and linked lists, System Design for e-commerce platform, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  {/* File Uploads */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Resume Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resume (Optional)
                      </label>
                      {config.customContext.resumeFile ? (
                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <FileText className="w-5 h-5 text-green-600" />
                          <span className="flex-1 text-sm text-green-700 truncate">
                            {config.customContext.resumeFile.name}
                          </span>
                          <button
                            onClick={() => removeFile('resume')}
                            className="p-1 hover:bg-green-100 rounded"
                          >
                            <X className="w-4 h-4 text-green-600" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-gray-50 transition-colors">
                          {uploadingFile === 'resume' ? (
                            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-gray-400 mb-2" />
                              <span className="text-sm text-gray-500">Upload Resume</span>
                              <span className="text-xs text-gray-400 mt-1">PDF, TXT, DOC</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept=".pdf,.txt,.doc,.docx"
                            onChange={(e) => handleFileUpload(e, 'resume')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Job Description Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Description (Optional)
                      </label>
                      {config.customContext.jobDescriptionFile ? (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <span className="flex-1 text-sm text-blue-700 truncate">
                            {config.customContext.jobDescriptionFile.name}
                          </span>
                          <button
                            onClick={() => removeFile('jobDescription')}
                            className="p-1 hover:bg-blue-100 rounded"
                          >
                            <X className="w-4 h-4 text-blue-600" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-gray-50 transition-colors">
                          {uploadingFile === 'jobDescription' ? (
                            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-gray-400 mb-2" />
                              <span className="text-sm text-gray-500">Upload JD</span>
                              <span className="text-xs text-gray-400 mt-1">PDF, TXT, DOC</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept=".pdf,.txt,.doc,.docx"
                            onChange={(e) => handleFileUpload(e, 'jobDescription')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    The AI interviewer will use your resume and job description to ask relevant, personalized questions.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Mode & Skills */}
        {step === 2 && (
          <div className="animate-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Configure Your Session</h1>
              <p className="text-gray-500">Choose interaction mode and skills to focus on</p>
            </div>

            {/* Interaction Mode */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Interaction Mode</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.values(INTERACTION_MODES).map((mode) => {
                  const Icon = interactionModeIcons[mode];
                  return (
                    <button
                      key={mode}
                      onClick={() => handleModeSelect(mode)}
                      className={`p-6 rounded-xl border-2 text-center transition-all ${
                        config.interactionMode === mode
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                        config.interactionMode === mode ? 'bg-primary-600' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-6 h-6 ${config.interactionMode === mode ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {INTERACTION_MODE_LABELS[mode]}
                      </h3>
                      <p className="text-gray-500 text-sm">{INTERACTION_MODE_DESCRIPTIONS[mode]}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skill Focus */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills to Focus On</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.values(SKILLS).map((skill) => (
                  <button
                    key={skill}
                    onClick={() => handleSkillToggle(skill)}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${
                      config.skillFocus.includes(skill)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                      config.skillFocus.includes(skill) ? 'bg-primary-600' : 'bg-gray-200'
                    }`}>
                      {config.skillFocus.includes(skill) && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{SKILL_LABELS[skill]}</h3>
                      <p className="text-gray-500 text-sm">{SKILL_DESCRIPTIONS[skill]}</p>
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Ready to Start</h1>
              <p className="text-gray-500">
                {config.interactionMode === INTERACTION_MODES.TEXT_ONLY
                  ? 'Review your settings and start the practice session'
                  : 'Grant permissions and start the practice session'}
              </p>
            </div>

            {/* Session Summary */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Scenario</span>
                  <span className="text-gray-900 font-medium">{SCENARIO_LABELS[config.scenario]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mode</span>
                  <span className="text-gray-900 font-medium">{INTERACTION_MODE_LABELS[config.interactionMode]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Focus Skills</span>
                  <span className="text-gray-900 font-medium">
                    {config.skillFocus.map((s) => SKILL_LABELS[s]).join(', ')}
                  </span>
                </div>
                {config.scenario === SCENARIOS.CUSTOM && (
                  <>
                    {config.customContext.prompt && (
                      <div className="pt-3 border-t border-gray-100">
                        <span className="text-gray-500 text-sm">Custom Focus:</span>
                        <p className="text-gray-900 text-sm mt-1">{config.customContext.prompt}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      {config.customContext.resumeFile && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Resume uploaded
                        </span>
                      )}
                      {config.customContext.jobDescriptionFile && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          JD uploaded
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Permissions Check */}
            {config.interactionMode !== INTERACTION_MODES.TEXT_ONLY && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Permissions</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {permissions.microphone === true ? (
                        <Mic className="w-5 h-5 text-green-500" />
                      ) : permissions.microphone === false ? (
                        <MicOff className="w-5 h-5 text-red-500" />
                      ) : (
                        <Mic className="w-5 h-5 text-gray-400" />
                      )}
                      <span className="text-gray-900">Microphone</span>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      permissions.microphone === true ? 'bg-green-100 text-green-700' :
                      permissions.microphone === false ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
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
                          <Camera className="w-5 h-5 text-green-500" />
                        ) : permissions.camera === false ? (
                          <VideoOff className="w-5 h-5 text-red-500" />
                        ) : (
                          <Camera className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="text-gray-900">Camera</span>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        permissions.camera === true ? 'bg-green-100 text-green-700' :
                        permissions.camera === false ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {permissions.camera === true ? 'Granted' :
                         permissions.camera === false ? 'Denied' :
                         'Checking...'}
                      </span>
                    </div>
                  )}
                </div>

                {(permissions.microphone === false || permissions.camera === false) && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-700 font-medium">Permission Required</p>
                      <p className="text-red-600 text-sm">
                        Please allow access to your microphone{config.interactionMode === INTERACTION_MODES.AUDIO_VIDEO ? ' and camera' : ''} to continue.
                      </p>
                      <button
                        onClick={checkPermissions}
                        className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
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
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleStartSession}
              disabled={loading || !canProceed()}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Start Practice
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
