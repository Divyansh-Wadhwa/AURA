import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  Video, 
  MessageSquare, 
  Users, 
  Target, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Star,
  Play,
  Mic,
  TrendingUp,
  Lightbulb,
  RefreshCw,
  Award,
  Zap,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun
} from 'lucide-react';

const Landing = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [visibleSections, setVisibleSections] = useState({});
  const sectionsRef = useRef({});
  const testimonialRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [carouselSlide, setCarouselSlide] = useState(0);
  const totalSlides = 3;

  // Scroll-based animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => ({
              ...prev,
              [entry.target.id]: true,
            }));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    Object.values(sectionsRef.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Testimonial scroll handlers
  const scrollTestimonials = (direction) => {
    if (testimonialRef.current) {
      const scrollAmount = 340;
      testimonialRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleTestimonialScroll = () => {
    if (testimonialRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = testimonialRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Software Engineer',
      company: 'Tech Startup',
      experience: '2-5 yrs',
      content: 'AURA helped me become more aware of my speaking patterns without making me self-conscious. The reflections are insightful and actionable.',
      avatar: 'SC',
    },
    {
      name: 'Michael Torres',
      role: 'Product Manager',
      company: 'Fortune 500',
      experience: '5+ yrs',
      content: 'I used to freeze in interviews. After practicing with AURA, I feel naturally composed. It\'s like having a patient coach available anytime.',
      avatar: 'MT',
    },
    {
      name: 'Priya Sharma',
      role: 'MBA Student',
      company: 'Business School',
      experience: '0-2 yrs',
      content: 'The best part is there are no scores to stress about. I just practice, reflect, and gradually improve. My confidence has grown tremendously.',
      avatar: 'PS',
    },
    {
      name: 'James Wilson',
      role: 'Data Analyst',
      company: 'Finance Corp',
      experience: '2-5 yrs',
      content: 'The interview practice was very helpful. With the help and guidance from AURA, I\'ve been placed in my dream company. Highly recommend!',
      avatar: 'JW',
    },
    {
      name: 'Elena Rodriguez',
      role: 'UX Designer',
      company: 'Design Agency',
      experience: '3-5 yrs',
      content: 'The overall practice session was very good. It was a very natural experience. AURA helped me prepare for behavioral interviews effectively.',
      avatar: 'ER',
    },
    {
      name: 'David Kim',
      role: 'Sales Executive',
      company: 'SaaS Company',
      experience: '5+ yrs',
      content: 'Overall, I\'m satisfied with the quality of practice sessions. While there were some scheduling challenges, I am pleased with my improvement.',
      avatar: 'DK',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Practice Sessions' },
    { value: '40+', label: 'Scenarios' },
    { value: '95%', label: 'Feel More Confident' },
    { value: '4.9', label: 'User Rating', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Decorative Background Circles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 -right-32 w-80 h-80 bg-secondary-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -left-20 w-64 h-64 bg-accent-100/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 right-1/4 w-72 h-72 bg-primary-100/20 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>AURA</span>
            </Link>

            {/* Right Side - Navigation + CTA */}
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-6">
                <a href="#features" className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-sm font-medium transition-colors`}>Features</a>
                <a href="#how-it-works" className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-sm font-medium transition-colors`}>How it works</a>
                <a href="#testimonials" className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-sm font-medium transition-colors`}>Testimonials</a>
              </div>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link to="/login" className="px-5 py-2.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 bg-gradient-to-b from-primary-50/30 to-white relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-pink-50 border border-pink-200 mb-8">
            <Award className="w-4 h-4 text-pink-500" />
            <span className="text-sm font-semibold text-pink-600">#1 Behavioral Practice Platform</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900 leading-tight">
            Transform Your
            <br />
            <span className="bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Communication Skills</span>
          </h1>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Master the art of communication with AI-powered practice sessions, personalized 
            feedback and behavioral coaching that helps you grow naturally.
          </p>

          {/* Search/CTA Area */}
          <div className="max-w-xl mx-auto mb-6">
            <p className="text-gray-700 font-medium mb-3">What do you want to excel at?</p>
            <div className="flex gap-2 p-1.5 bg-white rounded-xl shadow-lg shadow-gray-200/50 border border-gray-200">
              <input 
                type="text" 
                placeholder="e.g. Role, Vertical, Technology"
                className="flex-1 px-4 py-3 text-gray-700 placeholder-gray-400 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm"
              />
              <Link to="/login" className="px-5 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-all flex items-center justify-center">
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['Full Stack Development', 'Finance & Accounting', 'Supply Chain & Logistics', 'E-commerce Manager'].map((tag) => (
                <span key={tag} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full text-xs hover:border-primary-300 hover:text-primary-700 cursor-pointer transition-colors">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 pt-8 mt-4">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center text-xs">👩</div>
                <div className="w-7 h-7 rounded-full bg-secondary-100 border-2 border-white flex items-center justify-center text-xs">👨</div>
                <div className="w-7 h-7 rounded-full bg-pink-100 border-2 border-white flex items-center justify-center text-xs">🧑</div>
              </div>
              <span className="text-sm"><strong className="text-gray-900">200K+</strong> <span className="text-gray-500">Success Stories</span></span>
            </div>
            <div className="h-4 w-px bg-gray-300 hidden md:block"></div>
            <span className="text-sm"><strong className="text-gray-900">40+</strong> <span className="text-gray-500">countries served</span></span>
            <div className="h-4 w-px bg-gray-300 hidden md:block"></div>
            <span className="text-sm"><strong className="text-gray-900">4500+</strong> <span className="text-gray-500">Experts</span></span>
            <div className="h-4 w-px bg-gray-300 hidden md:block"></div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm"><strong className="text-gray-900">4.8</strong> <span className="text-gray-500">Average rating</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Practice Types Section */}
      <section 
        id="features" 
        className="py-20 px-4 relative z-10"
        ref={(el) => (sectionsRef.current['features'] = el)}
      >
        <div className={`max-w-7xl mx-auto transition-all duration-700 ${visibleSections['features'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Large Featured Card - 1:1 Sessions */}
            <div className="lg:row-span-2 bg-gradient-to-br from-indigo-500 via-primary-500 to-primary-600 rounded-3xl p-8 relative overflow-hidden group hover:shadow-2xl hover:shadow-primary-500/25 transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <span className="absolute top-6 right-6 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-semibold rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3" /> Popular
              </span>
              <div className="relative z-10 h-full flex flex-col">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">1:1 Sessions with Experts</h3>
                <p className="text-white/80 mb-6 text-sm leading-relaxed">Connect directly with industry professionals for personalized interview prep, in-depth feedback and career guidance tailored to your goals.</p>
                <ul className="space-y-2 mb-8 text-sm">
                  <li className="flex items-start gap-2 text-white/90">
                    <span className="text-white mt-1">•</span>
                    Personalized One-on-One session with a dedicated subject matter expert
                  </li>
                  <li className="flex items-start gap-2 text-white/90">
                    <span className="text-white mt-1">•</span>
                    Real-time interaction and query resolution
                  </li>
                  <li className="flex items-start gap-2 text-white/90">
                    <span className="text-white mt-1">•</span>
                    Detailed feedback and guidance from the expert to help you improve
                  </li>
                </ul>
                <div className="mt-auto">
                  <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                    Book your session now
                  </Link>
                </div>
              </div>
            </div>

            {/* LinkedIn Review Card */}
            <Link to="/login" className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-blue-600 font-bold text-lg">in</span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">LinkedIn Review</h3>
              <p className="text-gray-500 text-sm">Polish your profile to impress recruiters</p>
            </Link>

            {/* Executive C-roles Card */}
            <Link to="/login" className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                  <Award className="w-5 h-5 text-amber-600" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Executive C-roles</h3>
              <p className="text-gray-500 text-sm">Expert-Led Sessions & Soundboarding for VPs, Directors and CXOs</p>
            </Link>

            {/* Resume Writing Card - Coral/Pink */}
            <Link to="/login" className="bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Resume Writing</h3>
              <p className="text-white/80 text-sm">Build a job-winning resume with expert help</p>
            </Link>

            {/* 1:1 Coding Sessions Card */}
            <Link to="/login" className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-green-600 font-mono text-sm">&lt;/&gt;</span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">1:1 Coding Sessions</h3>
              <p className="text-gray-500 text-sm">Practice live with MAANG+ experts and get feedback</p>
            </Link>
          </div>

          {/* Bottom Row Cards */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {/* AI Mock Interviews */}
            <Link to="/login" className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">AI Mock Interviews</h3>
                    <p className="text-gray-500 text-sm">Practice with our advanced AI Expert that adapts to your industry and experience level.</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
              </div>
            </Link>

            {/* For Organizations */}
            <Link to="/login" className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-secondary-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">For organizations – Hire & Train with Confidence</h3>
                    <p className="text-gray-500 text-sm">AI-driven sessions for candidate screening and student training with real interview practice and personalized feedback.</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Showcase / Hero Carousel */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Step Into the Ultimate Practice Experience
            </h2>
            <p className="text-gray-500">
              Experience a professional-grade practice setup designed for success
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Video Preview */}
            <div className="relative">
              <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-secondary-600/20"></div>
                  <div className="relative z-10 text-center">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-white/20 transition-colors">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                    <p className="text-white/60 text-sm">Watch how it works</p>
                  </div>
                </div>
                {/* Video Controls Bar */}
                <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-xs">
                    <span>AURA Practice Session</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Face-to-face real time practice
              </h3>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Seamless and professional virtual interview interface</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Real-time video and audio for interactive sessions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Built-in session playback feature for review</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Secure and distraction-free environment</span>
                </li>
              </ul>
              <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors">
                Schedule Your Session Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Carousel Dots */}
          <div className="flex items-center justify-center gap-3 mt-12">
            <button 
              onClick={() => setCarouselSlide((prev) => (prev - 1 + totalSlides) % totalSlides)}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div className="flex gap-2">
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  onClick={() => setCarouselSlide(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${carouselSlide === index ? 'bg-primary-600' : 'bg-gray-300 hover:bg-gray-400'}`}
                />
              ))}
            </div>
            <button 
              onClick={() => setCarouselSlide((prev) => (prev + 1) % totalSlides)}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </section>

      {/* The Problem & Solution Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Traditional Practice Falls Short
            </h2>
            <div className="w-16 h-1 bg-primary-600 mx-auto rounded-full"></div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-300 via-accent-300 to-green-300 hidden md:block"></div>

            {/* Problem */}
            <div className="relative mb-12 md:pl-24">
              <div className="absolute left-0 top-0 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center hidden md:flex">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">!</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">The Problem</span>
                <h3 className="text-xl font-bold text-gray-900 mt-4 mb-3">Why Traditional Methods Don't Work</h3>
                <p className="text-gray-600 leading-relaxed">
                  Most people don't struggle with communication because they lack knowledge—they struggle because they lack 
                  <strong> practice under realistic conditions</strong>. Traditional coaching creates self-consciousness through 
                  constant evaluation. Scores make people anxious. Feedback feels like judgment.
                </p>
              </div>
            </div>

            {/* Solution */}
            <div className="relative mb-12 md:pl-24">
              <div className="absolute left-0 top-0 w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center hidden md:flex">
                <div className="w-10 h-10 bg-accent-500 rounded-full flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-accent-600 bg-accent-50 px-3 py-1 rounded-full">The AURA Approach</span>
                <h3 className="text-xl font-bold text-gray-900 mt-4 mb-3">Behavioral Shaping, Not Scoring</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">What We Do Differently</h4>
                    <p className="text-gray-600 text-sm">
                      AURA measures your communication patterns behind the scenes but never shows you numbers. 
                      Instead, you receive human-readable observations and one small focus at a time.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">What You Experience</h4>
                    <p className="text-gray-600 text-sm">
                      Natural conversations, meaningful reflections, and gradual growth. 
                      No judgment, no shame—just consistent practice that shapes behavior over time.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="relative md:pl-24">
              <div className="absolute left-0 top-0 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center hidden md:flex">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-primary-50 rounded-2xl p-6 border border-green-200">
                <span className="text-xs font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">The Results</span>
                <h3 className="text-xl font-bold text-gray-900 mt-4 mb-4">Natural Growth Over Time</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600">95%</div>
                    <div className="text-sm text-gray-600">Feel More Confident</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600">3x</div>
                    <div className="text-sm text-gray-600">More Practice Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600">82%</div>
                    <div className="text-sm text-gray-600">Report Less Anxiety</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600">4.9</div>
                    <div className="text-sm text-gray-600">User Satisfaction</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section 
        id="how-it-works" 
        className="py-20 px-4 relative z-10"
        ref={(el) => (sectionsRef.current['how-it-works'] = el)}
      >
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${visibleSections['how-it-works'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How AURA Works
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              A simple loop of practice, reflection, and focus—designed to build skills without creating self-consciousness.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Play, color: 'primary', title: 'Enter a Practice Session', desc: 'Choose your scenario—interview, presentation, or casual conversation.', delay: '0' },
              { icon: MessageSquare, color: 'accent', title: 'Have a Natural Conversation', desc: 'Speak naturally with our AI. No scripts, no pressure—just authentic practice.', delay: '100' },
              { icon: Lightbulb, color: 'green', title: 'Get Meaningful Reflections', desc: 'Receive human-readable observations about your communication patterns.', delay: '200' },
              { icon: RefreshCw, color: 'secondary', title: 'Focus on One Skill', desc: 'Pick one small behavioral focus for your next session and repeat.', delay: '300' },
            ].map((step, index) => {
              const IconComponent = step.icon;
              const colorClasses = {
                primary: 'bg-primary-100 text-primary-500 group-hover:bg-primary-500',
                accent: 'bg-accent-100 text-accent-500 group-hover:bg-accent-500',
                green: 'bg-green-100 text-green-500 group-hover:bg-green-500',
                secondary: 'bg-secondary-100 text-secondary-500 group-hover:bg-secondary-500',
              };
              return (
                <div 
                  key={index} 
                  className={`relative transition-all duration-700 ${visibleSections['how-it-works'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${step.delay}ms` }}
                >
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 h-full group">
                    <div className={`w-12 h-12 ${colorClasses[step.color]} rounded-xl flex items-center justify-center mb-4 transition-colors duration-300`}>
                      <IconComponent className="w-6 h-6 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="text-xs font-semibold text-gray-400 mb-2">Step {index + 1}</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-500 text-sm">{step.desc}</p>
                  </div>
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                      <ArrowRight className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section 
        id="testimonials" 
        className="py-20 bg-gray-50 relative z-10 overflow-hidden"
        ref={(el) => (sectionsRef.current['testimonials'] = el)}
      >
        {/* Decorative circles for this section */}
        <div className="absolute -left-20 top-1/2 w-64 h-64 bg-primary-100/50 rounded-full blur-3xl"></div>
        <div className="absolute -right-20 bottom-0 w-48 h-48 bg-secondary-100/50 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4">
          <div className={`text-center mb-12 transition-all duration-700 ${visibleSections['testimonials'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Real Stories. Real Impact.
            </h2>
            <div className="w-16 h-1 bg-primary-600 mx-auto rounded-full mb-4"></div>
            <p className="text-gray-600 text-lg">
              See how AURA has helped people grow their communication skills naturally.
            </p>
          </div>
          
          {/* Horizontal Scrolling Testimonials */}
          <div className="relative">
            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => scrollTestimonials('left')}
                  disabled={!canScrollLeft}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 ${
                    canScrollLeft 
                      ? 'border-gray-300 hover:border-primary-500 hover:bg-primary-50 text-gray-600 hover:text-primary-600' 
                      : 'border-gray-200 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollTestimonials('right')}
                  disabled={!canScrollRight}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 ${
                    canScrollRight 
                      ? 'border-gray-300 hover:border-primary-500 hover:bg-primary-50 text-gray-600 hover:text-primary-600' 
                      : 'border-gray-200 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <a href="#" className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1">
                View all
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Scrollable Container */}
            <div 
              ref={testimonialRef}
              onScroll={handleTestimonialScroll}
              className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index} 
                  className={`flex-shrink-0 w-[320px] bg-white rounded-2xl p-6 border border-primary-100 hover:border-primary-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 snap-start ${
                    visibleSections['testimonials'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{testimonial.name}</div>
                      <div className="text-xs text-gray-500">{testimonial.role} • {testimonial.experience}</div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-4">{testimonial.content}</p>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Scroll Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {[...Array(Math.ceil(testimonials.length / 3))].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${i === 0 ? 'bg-primary-600' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-20 px-4 relative z-10"
        ref={(el) => (sectionsRef.current['cta'] = el)}
      >
        <div className={`max-w-4xl mx-auto transition-all duration-700 ${visibleSections['cta'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-gradient-to-br from-primary-600 to-secondary-600 rounded-3xl p-12 text-center relative overflow-hidden hover:shadow-2xl hover:shadow-primary-500/30 transition-shadow duration-300">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Grow Your Communication Skills?
              </h2>
              <p className="text-primary-100 mb-8 max-w-xl mx-auto text-lg">
                Start practicing with AURA today. No scores, no judgment—just meaningful 
                practice that helps you grow naturally.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-xl">
                Start Free Practice
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-gray-900">AURA</span>
                <p className="text-sm text-gray-500">Behavioral Practice Environment</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <a href="#" className="text-gray-500 hover:text-gray-900 text-sm">Privacy</a>
              <a href="#" className="text-gray-500 hover:text-gray-900 text-sm">Terms</a>
              <a href="#" className="text-gray-500 hover:text-gray-900 text-sm">Contact</a>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 AURA. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
