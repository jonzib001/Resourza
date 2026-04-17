import React from 'react';

export default function HeroText() {
  return (
    <div className="max-w-xl w-full pr-16 font-manrope">
      {/* 1. MAIN HEADLINE (Using ExtraBold/Bold as requested) */}
      <h1 className="text-6xl font-extrabold text-secondary-slate leading-tight mb-8">
        One Source <br />
        <span className="text-primary-academic">Every  Resource</span>
      </h1>

      {/* 2. BODY TEXT (Regular legibility) */}
      <p className="text-lg text-gray-700 leading-relaxed mb-10 max-w-lg">
        Curated O Level, IGCSE & A Level resources for educators and learners.
        Structured past papers, notes, and tools to simplify teaching and boost results.
      </p>

      {/* 3. TAGS */}
      <div className="flex gap-4">
        {[ "Less Searching", "More Learning" ].map((tag, i) => (
          <span key={tag} className={`px-5 py-2 rounded-full text-xs font-semibold ${i === 1 ? "bg-red-100 text-red-800" : "bg-purple-100 text-purple-800"}`}>
            {tag.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}