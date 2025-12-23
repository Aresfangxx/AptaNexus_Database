
import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { CONTENT } from './constants';
import { Language } from './types';
import { StemLoopIcon, NeuralTexture, SearchIcon, ArrowRight, DatabaseIcon } from './components/Icons';
import { ParticleBackground } from './components/ParticleBackground';
import { SearchResults } from './components/SearchResults';
import { TargetDetailPage } from './components/TargetDetailPage';
import { AptamerDetailPage } from './components/AptamerDetailPage';

// Layout component for non-home pages
const InnerPageLayout: React.FC<{ children: React.ReactNode; lang: Language; setLang: (lang: Language) => void }> = ({ children, lang, setLang }) => {
  return (
    <div className="min-h-screen bg-[#fcfcfc] text-academic-900 font-sans selection:bg-slate-200">
      {/* Simple Navbar for Inner Pages */}
      <nav className="fixed top-0 w-full bg-white z-50 border-b border-academic-200 h-16 flex items-center justify-between px-6 lg:px-12">
        <Link to="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <DatabaseIcon className="w-6 h-6 text-academic-700" />
          <span className="font-serif font-semibold text-lg tracking-tight text-academic-900">AptaNexus</span>
        </Link>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setLang(lang === 'en' ? 'cn' : 'en')}
            className="mr-4 text-xs font-semibold uppercase tracking-wider text-academic-500 hover:text-academic-900"
          >
            {lang === 'en' ? '中文' : 'EN'}
          </button>
          <Link to="/" className="text-sm font-medium text-academic-600 hover:text-academic-900">Home</Link>

        </div>
      </nav>

      <div className="pt-16">
        {children}
      </div>
    </div>
  );
};

// Home page component
const HomePage: React.FC<{ lang: Language; setLang: (lang: Language) => void }> = ({ lang, setLang }) => {
  const navigate = useNavigate();
  const t = CONTENT[lang];

  const handleNavigateSearch = () => {
    navigate('/search');
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-academic-900 font-sans selection:bg-slate-200 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-[#fcfcfc]/90 backdrop-blur-md z-50 border-b border-academic-100 h-16 flex items-center justify-between px-6 lg:px-12 transition-all duration-300">
        <Link to="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="transform transition-transform group-hover:rotate-12 duration-500">
            <DatabaseIcon className="w-6 h-6 text-academic-700" />
          </div>
          <span className="font-serif font-semibold text-lg tracking-tight text-academic-900">AptaNexus</span>
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-6 text-sm text-academic-600 font-medium">
            <Link
              to="/search"
              className="hover:text-academic-900 transition-colors relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-[-4px] after:left-0 after:bg-academic-900 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left"
            >
              Search
            </Link>
            <a href="#about" className="hover:text-academic-900 transition-colors relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-[-4px] after:left-0 after:bg-academic-900 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left">About</a>
            <a href="#data" className="hover:text-academic-900 transition-colors relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-[-4px] after:left-0 after:bg-academic-900 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left">Data</a>
            <a href="#api" className="hover:text-academic-900 transition-colors relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-[-4px] after:left-0 after:bg-academic-900 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left">API</a>

          </div>
          <button
            onClick={() => setLang(lang === 'en' ? 'cn' : 'en')}
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wider border border-academic-300 rounded hover:bg-academic-100 transition-colors active:scale-95"
          >
            {lang === 'en' ? '中文' : 'EN'}
          </button>
        </div>
      </nav>

      <main className="pt-16">

        {/* HERO SECTION */}
        <section className="relative min-h-[90vh] flex flex-col justify-center items-center px-6 lg:px-20 overflow-hidden">
          {/* Background Decor */}
          <ParticleBackground />

          <div className="absolute inset-0 z-0 pointer-events-none">
            {/* Left RNA Sketch - Animated */}
            <div className="absolute top-1/2 -translate-y-1/2 left-[2%] w-[450px] h-[650px] opacity-[0.04] animate-float">
              <StemLoopIcon className="w-full h-full text-academic-900" />
            </div>
            {/* Right Neural Texture - Rotating slowly */}
            <div className="absolute top-20 right-0 w-[400px] h-[400px] opacity-[0.03] animate-spin-slow origin-center">
              <NeuralTexture className="w-full h-full text-academic-800" />
            </div>
          </div>

          <div className="relative z-10 w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Main Text Content */}
            <div className="lg:col-span-8 space-y-8">
              <h1 className="font-serif text-4xl lg:text-6xl leading-[1.1] text-academic-900 animate-fade-in-up">
                {t.hero.title}
              </h1>

              <div className="space-y-4 max-w-2xl animate-fade-in-up delay-200">
                {t.hero.subtitle.map((line, idx) => (
                  <p key={idx} className="text-lg lg:text-xl font-light text-academic-600 leading-relaxed border-l-2 border-academic-200 pl-4">
                    {line}
                  </p>
                ))}
              </div>

              {/* Quick Actions / CTA in Hero */}
              <div className="pt-4 flex flex-wrap gap-4 animate-fade-in-up delay-500">
                <button
                  onClick={handleNavigateSearch}
                  className="bg-academic-900 text-white px-8 py-3 rounded-sm font-medium hover:bg-academic-800 transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  {t.search.buttons[3]}
                </button>
                <button className="border border-academic-300 px-8 py-3 rounded-sm font-medium text-academic-700 hover:bg-academic-50 transition-all hover:border-academic-400">
                  Documentation
                </button>
              </div>
            </div>

            {/* Vertical Timeline (Hero Visual) */}
            <div className="lg:col-span-4 flex flex-col justify-center h-full pl-8 lg:border-l border-academic-200/50 animate-fade-in-up delay-700">
              <div className="space-y-12 relative">
                {/* Vertical Line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-academic-200"></div>

                {t.hero.timeline.map((item, idx) => (
                  <div key={idx} className="relative pl-8 group cursor-default">
                    <div className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-[3px] bg-[#fcfcfc] z-10 transition-all duration-300 ${idx === 3 ? 'border-academic-800 bg-academic-800 scale-110 shadow-[0_0_15px_rgba(52,58,64,0.3)]' : 'border-academic-300 group-hover:border-academic-500 group-hover:scale-110'}`}></div>
                    <span className="block text-sm font-bold text-academic-400 mb-1 transition-colors group-hover:text-academic-600">{item.year}</span>
                    <span className={`block text-lg font-medium transition-transform duration-300 group-hover:translate-x-1 ${idx === 3 ? 'text-academic-900' : 'text-academic-600'}`}>{item.event}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* SEARCH SECTION (Home Page) */}
        <section id="search" className="py-12 bg-white border-y border-academic-100">
          <div className="max-w-4xl mx-auto px-6">
            {/* This input now just acts as a trigger to the detailed search page */}
            <div className="bg-academic-50 p-1 rounded-lg border border-academic-200 shadow-sm flex items-center focus-within:ring-2 focus-within:ring-academic-200 focus-within:border-academic-300 transition-all duration-300 hover:shadow-md cursor-text">
              <div className="pl-4 pr-3 text-academic-400">
                <SearchIcon className="w-6 h-6" />
              </div>
              <input
                type="text"
                onFocus={handleNavigateSearch}
                readOnly
                placeholder={t.search.placeholder}
                className="w-full bg-transparent py-4 text-lg text-academic-900 placeholder:text-academic-400 focus:outline-none font-light cursor-text"
              />
              <button
                onClick={handleNavigateSearch}
                className="bg-academic-900 text-white px-6 py-2.5 rounded m-1.5 font-medium text-sm hover:bg-academic-800 transition-colors shadow-sm"
              >
                Search
              </button>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3"></div>
          </div>
        </section>

        {/* MISSION & STATS */}
        <section id="data" className="py-24 px-6 lg:px-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

            {/* Mission Text */}
            <div className="lg:col-span-5 space-y-6">
              <h2 className="font-serif text-3xl text-academic-900">{t.mission.title}</h2>
              <p className="text-academic-600 leading-relaxed font-light text-lg">
                {t.mission.body}
              </p>
              <div className="h-1 w-20 bg-academic-200 mt-8 rounded-full"></div>
            </div>

            {/* Stats Grid */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8">
                {t.stats.items.map((stat, idx) => (
                  <div key={idx} className="space-y-1 group p-4 rounded-lg hover:bg-academic-50 transition-colors duration-300">
                    <div className="text-3xl lg:text-4xl font-light text-academic-900 tabular-nums group-hover:scale-105 transition-transform duration-300 origin-left">
                      {stat.value}
                    </div>
                    <div className="text-xs uppercase tracking-widest text-academic-500 font-medium group-hover:text-academic-700 transition-colors">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-12 text-sm text-academic-500 italic max-w-lg border-l-2 border-academic-200 pl-4">
                "{t.stats.footer}"
              </p>
            </div>
          </div>
        </section>

        {/* WHAT ARE APTAMERS (Education) */}
        <section id="about" className="py-24 bg-academic-50 border-y border-academic-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Illustration Area */}
            <div className="flex justify-center items-center h-80 bg-white rounded-xl border border-academic-200 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow duration-500">
              <img src="/index picture.jpeg" alt="Aptamer Structure" className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" />
            </div>

            {/* Text */}
            <div className="space-y-6">
              <h2 className="font-serif text-3xl text-academic-900">{t.education.title}</h2>
              <p className="text-academic-600 leading-relaxed text-lg font-light">
                {t.education.body}
              </p>
              <a href="#" className="inline-flex items-center text-academic-900 font-medium group mt-2">
                <span className="group-hover:underline decoration-1 underline-offset-4">Learn more about aptamer selection</span>
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </section>

        {/* AI READY SECTION */}
        <section id="api" className="py-24 px-6 lg:px-20 max-w-7xl mx-auto relative group">
          {/* Moving gradient background on container */}
          <div className="absolute -inset-1 bg-gradient-to-r from-academic-200 to-academic-300 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full opacity-5 pointer-events-none">
            <NeuralTexture className="w-full h-full text-academic-900 animate-pulse-slow" />
          </div>

          <div className="relative bg-academic-900 bg-[linear-gradient(45deg,#212529,#343a40)] text-academic-100 rounded-2xl p-12 lg:p-16 overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-animate opacity-10 bg-[linear-gradient(270deg,transparent,rgba(255,255,255,0.1),transparent)] pointer-events-none"></div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">

                <h2 className="font-serif text-3xl lg:text-4xl text-white">
                  {t.ai.title}
                </h2>
                <p className="text-academic-400 text-lg font-light leading-relaxed">
                  {t.ai.body}
                </p>

              </div>

              {/* Decorative Code Block look */}
              <div className="hidden lg:block bg-academic-950 p-6 rounded-lg font-mono text-sm text-academic-400 border border-academic-800 shadow-2xl transform transition-transform duration-500 hover:scale-[1.02]">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <div className="opacity-90 hover:opacity-100 transition-opacity">
                  <p className="text-blue-300">{`{`}</p>
                  <p className="pl-4"><span className="text-blue-300">"mcpServers"</span>: <span className="text-blue-300">{`{`}</span></p>
                  <p className="pl-8"><span className="text-blue-300">"aptamer-db"</span>: <span className="text-blue-300">{`{`}</span></p>
                  <p className="pl-12"><span className="text-blue-300">"command"</span>: <span className="text-orange-300">"npx"</span>,</p>
                  <p className="pl-12"><span className="text-blue-300">"args"</span>: [</p>
                  <p className="pl-16"><span className="text-orange-300">"-y"</span>,</p>
                  <p className="pl-16"><span className="text-orange-300">"aptamer-mcp-server"</span></p>
                  <p className="pl-12">],</p>
                  <p className="pl-12"><span className="text-blue-300">"env"</span>: <span className="text-blue-300">{`{`}</span></p>
                  <p className="pl-16"><span className="text-blue-300">"APTAMERS_URL"</span>: <span className="text-orange-300">"https://aptamer-database.vercel.app/APTAMERS.jsonl"</span></p>
                  <p className="pl-12"><span className="text-blue-300">{`}`}</span></p>
                  <p className="pl-8"><span className="text-blue-300">{`}`}</span></p>
                  <p className="pl-4"><span className="text-blue-300">{`}`}</span></p>
                  <p className="text-blue-300">{`}`}</p>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* FOOTER */}
        <footer className="bg-white border-t border-academic-200 py-12 text-center text-sm text-academic-500">
          <p>© 2025 AptaNexus AI. All rights reserved.</p>
          <p className="mt-2">Connecting Molecular Recognition with Artificial Intelligence.</p>
        </footer>

      </main>
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <Routes>
      <Route path="/" element={<HomePage lang={lang} setLang={setLang} />} />
      <Route
        path="/search"
        element={
          <InnerPageLayout lang={lang} setLang={setLang}>
            <SearchResults lang={lang} />
          </InnerPageLayout>
        }
      />
      <Route
        path="/target/:targetName"
        element={
          <InnerPageLayout lang={lang} setLang={setLang}>
            <TargetDetailPage />
          </InnerPageLayout>
        }
      />
      <Route
        path="/aptamer/:aptamerId"
        element={
          <InnerPageLayout lang={lang} setLang={setLang}>
            <AptamerDetailPage />
          </InnerPageLayout>
        }
      />
    </Routes>
  );
}
