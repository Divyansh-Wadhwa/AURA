import { Link } from 'react-router-dom';
import { 
  Brain, 
  Video, 
  MessageSquare, 
  BarChart3, 
  Target, 
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: Video,
      title: 'Real-time Video Interviews',
      description: 'Practice with WebRTC-powered video calls that simulate real interview environments.',
    },
    {
      icon: Brain,
      title: 'AI Interviewer',
      description: 'Engage with an intelligent AI that asks relevant follow-up questions and maintains context.',
    },
    {
      icon: BarChart3,
      title: 'Objective Scoring',
      description: 'Receive ML-based scores on confidence, clarity, empathy, and communication.',
    },
    {
      icon: Target,
      title: 'Explainable Feedback',
      description: 'Understand exactly what to improve with detailed, actionable insights.',
    },
  ];

  const benefits = [
    'Practice anytime, anywhere',
    'No human bias in evaluation',
    'Track progress over time',
    'Multiple interview scenarios',
    'Instant feedback',
    'Completely private',
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">A.U.R.A</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="btn-ghost">
                Sign In
              </Link>
              <Link to="/login" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-900/30 border border-primary-700/50 mb-8">
            <Zap className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-primary-300">AI-Powered Interview Assessment</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-white">Master Your</span>
            <br />
            <span className="gradient-text">Interview Skills</span>
          </h1>
          
          <p className="text-xl text-dark-300 max-w-2xl mx-auto mb-10">
            A.U.R.A uses advanced AI to simulate real interviews and provide 
            objective, explainable feedback to help you improve your communication skills.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="btn-primary btn-lg flex items-center gap-2">
              Start Practicing
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#features" className="btn-outline btn-lg">
              Learn More
            </a>
          </div>

          {/* Hero Visual */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-transparent z-10" />
            <div className="relative rounded-2xl overflow-hidden border border-dark-700 shadow-2xl shadow-primary-500/10">
              <div className="bg-dark-900 p-4 border-b border-dark-700 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="bg-dark-800/50 p-8 grid md:grid-cols-2 gap-6">
                <div className="bg-dark-900 rounded-xl p-4 border border-dark-700">
                  <div className="aspect-video bg-dark-800 rounded-lg flex items-center justify-center">
                    <Video className="w-12 h-12 text-dark-500" />
                  </div>
                  <p className="text-sm text-dark-400 mt-3 text-center">Video Interview</p>
                </div>
                <div className="bg-dark-900 rounded-xl p-4 border border-dark-700">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-600 flex-shrink-0" />
                      <div className="bg-dark-800 rounded-lg p-3 text-sm text-dark-300">
                        Tell me about a challenging project you worked on.
                      </div>
                    </div>
                    <div className="flex items-start gap-3 justify-end">
                      <div className="bg-primary-900/50 rounded-lg p-3 text-sm text-dark-200">
                        In my last role, I led a team...
                      </div>
                      <div className="w-8 h-8 rounded-full bg-accent-600 flex-shrink-0" />
                    </div>
                  </div>
                  <p className="text-sm text-dark-400 mt-3 text-center">AI Conversation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-dark-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="section-title">Powerful Features</h2>
            <p className="section-subtitle">Everything you need to ace your next interview</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="card-hover group">
                <div className="w-12 h-12 rounded-xl bg-primary-900/50 border border-primary-700/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-dark-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Simple steps to improve your interview skills</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Choose Your Scenario', desc: 'Select from technical, behavioral, HR interviews, or case studies.' },
              { step: '02', title: 'Practice with AI', desc: 'Engage in realistic conversation with our AI interviewer.' },
              { step: '03', title: 'Get Feedback', desc: 'Receive objective scores and actionable improvement tips.' },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-bold text-dark-800 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-dark-400">{item.desc}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 right-0 translate-x-1/2">
                    <ArrowRight className="w-8 h-8 text-dark-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 bg-dark-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-title mb-6">Why Choose A.U.R.A?</h2>
              <p className="text-dark-300 mb-8">
                Unlike traditional interview prep, A.U.R.A provides objective, 
                ML-based assessment that removes human bias and gives you 
                consistent, actionable feedback every time.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent-400 flex-shrink-0" />
                    <span className="text-dark-200">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-white">Your Progress</h3>
                  <span className="badge-accent">+15% this week</span>
                </div>
                <div className="space-y-4">
                  {['Confidence', 'Clarity', 'Empathy', 'Communication'].map((skill, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-dark-300">{skill}</span>
                        <span className="text-white">{70 + index * 5}%</span>
                      </div>
                      <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full gradient-bg rounded-full transition-all duration-500"
                          style={{ width: `${70 + index * 5}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="card gradient-border p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Ace Your Next Interview?
            </h2>
            <p className="text-dark-300 mb-8 max-w-xl mx-auto">
              Start practicing with A.U.R.A today and get the objective feedback 
              you need to improve your interview skills.
            </p>
            <Link to="/login" className="btn-primary btn-lg inline-flex items-center gap-2">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-dark-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">A.U.R.A</span>
          </div>
          <p className="text-dark-500 text-sm">
            AI-Based Unified Response Assessment
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
