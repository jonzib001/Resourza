import React, { useState, useEffect } from 'react';

// --- ICON COMPONENTS ---
const DownloadIcon = () => (
  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
);
const FormHeaderIcon = ({ children }) => (
  <span className="text-gray-400 mr-2 flex items-center">{children}</span>
);
const CheckCircleIcon = () => (
  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
);

// --- CUSTOM DROPDOWN COMPONENT ---
const CustomSelect = ({ value, onChange, options, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => String(opt.value) === String(value));

  return (
    <div className={`relative w-full ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div
        className={`w-full bg-bg-light-slate rounded-xl p-4 text-sm font-medium border border-gray-100 flex justify-between items-center transition-all ${disabled ? 'pointer-events-none' : 'cursor-pointer hover:border-primary-academic'} ${isOpen ? 'ring-2 ring-primary-academic/20 border-primary-academic' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`truncate pr-4 ${value ? "text-gray-900" : "text-gray-400"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg className={`shrink-0 w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary-academic' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto py-2 animate-fade-in-down custom-scrollbar">
            {options.map((opt) => (
              <div
                key={opt.value}
                className={`px-5 py-3 text-sm cursor-pointer transition-colors ${String(value) === String(opt.value) ? 'bg-primary-academic/10 text-primary-academic font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};


export default function ResourceFetcherForm() {
  const [database, setDatabase] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // --- NEW DOWNLOAD STATES ---
  const [downloadState, setDownloadState] = useState('idle'); // 'idle' | 'processing' | 'success'
  const [progress, setProgress] = useState(0);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [selectedPapers, setSelectedPapers] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState(["All"]);

  useEffect(() => {
    const fetchDatabase = async () => {
      try {
        const response = await fetch("https://resourza-production.up.railway.app/api/subjects");
        const data = await response.json();
        setDatabase(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch database.", error);
        setIsLoading(false);
      }
    };
    fetchDatabase();
  }, []);

  const currentSubjectData = database[selectedSubject];

  const subjectOptions = Object.keys(database).map(code => ({
    value: code,
    label: `${code} - ${database[code].short_name || database[code].name}`
  }));

  const availableYears = currentSubjectData 
    ? Array.from({ length: currentSubjectData.yearend - currentSubjectData.yearstart + 1 }, 
        (_, i) => currentSubjectData.yearstart + i) 
    : [];
    
  const yearOptions = availableYears.map(year => ({
    value: String(year),
    label: `20${year}`
  }));

  const handlePaperToggle = (paperCode) => {
    setSelectedPapers(prev => prev.includes(paperCode) ? prev.filter(p => p !== paperCode) : [...prev, paperCode]);
  };

  const handleVariantToggle = (variant) => {
    if (variant === "All") {
      setSelectedVariants(["All"]);
      return;
    }
    setSelectedVariants(prev => {
      const withoutAll = prev.filter(v => v !== "All");
      if (withoutAll.includes(variant)) {
        const newSelection = withoutAll.filter(v => v !== variant);
        return newSelection.length === 0 ? ["All"] : newSelection;
      } else {
        return [...withoutAll, variant];
      }
    });
  };

  // --- UPGRADED DOWNLOAD FUNCTION ---
  const handleDownload = async () => {
    if (!selectedSubject || !startYear || !endYear || selectedPapers.length === 0) {
      alert("Please fill out all fields!");
      return;
    }
    
    setDownloadState('processing');
    setProgress(5); // Show a little immediate progress so the user knows it clicked

    const payload = {
      subject_code: selectedSubject,
      start_year: parseInt(startYear),
      end_year: parseInt(endYear),
      selected_papers: selectedPapers,
      selected_variants: selectedVariants
    };

    try {
      const response = await fetch("https://resourza-production.up.railway.app/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Download failed");

      // 1. Get the total file size (If your Python backend sends it)
      const contentLength = response.headers.get('content-length');
      console.log("The exact file size from Python is:", contentLength);
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      // 2. Read the stream chunk by chunk
      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;

        // 3. Calculate real progress
        if (total) {
          setProgress(Math.round((loaded / total) * 100));
        } else {
          // Fallback: If python doesn't send size, fake a smooth progress bar
          setProgress(p => Math.min(p + Math.random() * 10, 95)); 
        }
      }

      // 4. Combine chunks and trigger the browser download
      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CAIE_${selectedSubject}_Papers.zip`;
      link.click();
      window.URL.revokeObjectURL(url);

      // 5. Trigger the Success State
      setProgress(100);
      setDownloadState('success');

      // 6. Smoothly reset the form after 3.5 seconds
      setTimeout(() => {
        setDownloadState('idle');
        setProgress(0);
      }, 3500);

    } catch (error) {
      alert("Error downloading. Check backend terminal.");
      console.error(error);
      setDownloadState('idle');
      setProgress(0);
    }
  };
  
  const SectionHeader = ({ iconSvg, title, color }) => (
    <h3 className={`flex items-center text-sm font-semibold mb-3 font-manrope ${color || "text-secondary-slate"}`}>
      <FormHeaderIcon>{iconSvg}</FormHeaderIcon>
      {title}
    </h3>
  );

  const StyledCheckbox = ({ checked, onChange, id, label }) => (
    <label htmlFor={id} className="flex items-start gap-3 group cursor-pointer font-manrope">
      <input 
        type="checkbox" 
        id={id}
        className="hidden" 
        checked={checked} 
        onChange={onChange} 
      />
      <div className={`relative shrink-0 mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition ${
        checked ? "border-primary-academic bg-primary-academic" : "border-gray-200 bg-white group-hover:border-primary-academic"
      }`}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
        )}
      </div>
      <span className={`text-sm leading-snug ${checked ? "text-gray-900 font-medium" : "text-gray-600 group-hover:text-primary-academic"}`}>{label}</span>
    </label>
  );

  if (isLoading) return <div className="p-8 text-secondary-slate font-manrope">Loading Subject Database...</div>;

  return (
    <div className={`w-full max-w-lg bg-white p-10 rounded-3xl border border-bg-light-slate shadow-2xl font-manrope relative z-10 min-h-[450px] flex flex-col transition-all duration-500 ${!currentSubjectData ? "justify-center" : "justify-start"}`}>
      
      {!currentSubjectData && (
        <div className="text-center mb-10 animate-fade-in-down">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-primary-academic leading-snug mb-3">
            Welcome to Resourza <br/> Paper Compiler
          </h2>
          <p className="text-gray-500 font-medium">
            Choose a subject below to get started
          </p>
        </div>
      )}

      <div className={`flex gap-6 ${currentSubjectData ? 'mb-8' : 'mb-4'} transition-all duration-300`}>
        
        <div className={`${currentSubjectData ? 'flex-[1.5]' : 'w-full'} transition-all duration-300 z-30`}>
          <SectionHeader title="Select Subject" iconSvg={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path></svg>}/>
          
          <CustomSelect 
            options={subjectOptions}
            value={selectedSubject}
            placeholder="e.g. 9701-Chemistry"
            onChange={(val) => {
              setSelectedSubject(val);
              setStartYear(""); 
              setEndYear(""); 
              setSelectedPapers([]); 
              setSelectedVariants(["All"]);
            }}
          />
        </div>

        {currentSubjectData && (
          <div className="flex-1 flex gap-3 items-end animate-fade-in z-20">
            <div className="flex-1">
              <SectionHeader title="Timeline" iconSvg={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>}/>
              
              <CustomSelect 
                options={yearOptions}
                value={startYear}
                placeholder="From"
                onChange={(val) => setStartYear(val)}
              />
            </div>
            <div className="flex-1"> 
               <CustomSelect 
                options={yearOptions}
                value={endYear}
                placeholder="Till"
                onChange={(val) => setEndYear(val)}
              />
            </div>
          </div>
        )}
      </div>

      {currentSubjectData && (
        <div className="space-y-8 animate-fade-in-down z-10 relative">
          
          <div>
            <SectionHeader color="text-purple-700" title="Select Component" iconSvg={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}/>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pl-1">
              {currentSubjectData.components.map(comp => (
                <StyledCheckbox 
                  key={comp.paper} 
                  checked={selectedPapers.includes(comp.paper)} 
                  onChange={() => handlePaperToggle(comp.paper)}
                  id={`comp-${comp.paper}`}
                  label={comp.name} 
                />
              ))}
            </div>
          </div>

          <div>
            <SectionHeader color="text-red-700" title="Select Variants" iconSvg={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}/>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 pl-1">
              {["All", ...(currentSubjectData.variants || ["1", "2", "3"])].map(variant => (
                <StyledCheckbox 
                  key={variant} 
                  checked={selectedVariants.includes(String(variant))} 
                  onChange={() => handleVariantToggle(String(variant))}
                  id={`var-${variant}`}
                  label={variant === "All" ? "All Variants" : `Variant ${variant}`}
                />
              ))}
            </div>
          </div>

          {/* --- NEW DYNAMIC UI FOOTER --- */}
          <div className="min-h-[88px] mt-10">
            {downloadState === 'idle' && (
              <button 
                onClick={handleDownload}
                className="w-full p-5 rounded-full font-bold text-base flex items-center justify-center bg-primary-academic hover:bg-secondary-slate text-white shadow-xl hover:shadow-primary-academic/40 transition-all duration-300"
              >
                Generate Resources <DownloadIcon />
              </button>
            )}

            {downloadState === 'processing' && (
              <div className="w-full bg-bg-light-slate rounded-2xl p-5 border border-gray-100 flex flex-col gap-3 animate-fade-in">
                <div className="flex justify-between items-center text-sm font-bold text-secondary-slate">
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4 text-primary-academic" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    {progress < 20 ? 'Compiling Papers...' : 'Downloading Zip...'}
                  </span>
                  <span className="text-primary-academic">{progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-academic transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {downloadState === 'success' && (
              <div className="w-full p-5 rounded-full font-bold text-base flex items-center justify-center bg-bg-light-slate border border-primary-academic/30 text-secondary-slate shadow-xl shadow-primary-academic/10 animate-fade-in pointer-events-none transition-all duration-500">
                <svg className="w-6 h-6 mr-2 text-primary-academic" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Download Complete!
              </div>
            )}
          </div>
          
          {/* Keep Clear button visible only when idle or success */}
          {downloadState !== 'processing' && (
            <button onClick={() => { setSelectedSubject(""); setStartYear(""); setEndYear(""); setSelectedPapers([]); setSelectedVariants(["All"]); }} className="w-full mt-4 text-xs font-semibold text-gray-500 hover:text-red-600 transition">Clear All Selections</button>
          )}

        </div>
      )}
    </div>
  );
}