import React from 'react';
import Navbar from './components/Navbar';
import HeroText from './components/HeroText';
import ResourzaFetcherForm from './components/ResourzaFetcherForm';

function App() {
  return (
    <div className="min-h-screen bg-white font-manrope overflow-hidden relative">
      
      {/* 1. Navbar */}
      <Navbar />

      {/* 2. Main Page Content (Centering and Padding) */}
      <main className="min-h-screen flex items-center justify-center p-20 pt-40 relative">
        
        {/* 3. Translucent Watermark Text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 font-extrabold text-[12vw] text-translucent-watermark opacity-40 leading-none select-none pointer-events-none whitespace-nowrap">
          RESOURZA
        </div>

        {/* 4. The Flex Container for left and right */}
        <div className="flex items-center gap-20 relative z-10 w-full max-w-7xl">
          
          {/* Left Side (Static Text) */}
          <HeroText />

          {/* Right Side (Dynamic Python-connected Form) */}
          <ResourzaFetcherForm />

        </div>
      </main>
    </div>
  );
}

export default App;