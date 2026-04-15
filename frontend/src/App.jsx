import { useState, useEffect } from 'react';

function App() {
  // --- 1. STATE: Where React stores our data ---
  const [database, setDatabase] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  // User Selections
  const [selectedSubject, setSelectedSubject] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [selectedPapers, setSelectedPapers] = useState([]);
  
  // NEW: State for variants (Default to "All")
  const [selectedVariants, setSelectedVariants] = useState(["All"]);

  // --- 2. FETCH DATA: Get the JSON from FastAPI on load ---
  useEffect(() => {
    const fetchDatabase = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8001/api/subjects");
        const data = await response.json();
        setDatabase(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch database. Is the Python server running?", error);
        setIsLoading(false);
      }
    };
    fetchDatabase();
  }, []);

  // --- 3. HELPER FUNCTIONS ---
  const currentSubjectData = database[selectedSubject];

  const availableYears = currentSubjectData 
    ? Array.from({ length: currentSubjectData.yearend - currentSubjectData.yearstart + 1 }, 
        (_, i) => currentSubjectData.yearstart + i) 
    : [];

  const handlePaperToggle = (paperCode) => {
    setSelectedPapers(prev => 
      prev.includes(paperCode) 
        ? prev.filter(p => p !== paperCode) 
        : [...prev, paperCode]              
    );
  };

  // NEW: Handle variant toggles intelligently
  const handleVariantToggle = (variant) => {
    if (variant === "All") {
      setSelectedVariants(["All"]);
      return;
    }
    
    setSelectedVariants(prev => {
      const withoutAll = prev.filter(v => v !== "All");
      if (withoutAll.includes(variant)) {
        // If clicking a selected variant, remove it. If list becomes empty, default to "All"
        const newSelection = withoutAll.filter(v => v !== variant);
        return newSelection.length === 0 ? ["All"] : newSelection;
      } else {
        // Add the new variant
        return [...withoutAll, variant];
      }
    });
  };

  // --- 4. SUBMIT: Talk to the Scraper ---
  const handleDownload = async () => {
    if (!selectedSubject || !startYear || !endYear || selectedPapers.length === 0) {
      alert("Please fill out all fields and select at least one paper!");
      return;
    }

    setIsDownloading(true);
    
    // NEW: Added selected_variants to payload
    const payload = {
      subject_code: selectedSubject,
      start_year: parseInt(startYear),
      end_year: parseInt(endYear),
      selected_papers: selectedPapers,
      selected_variants: selectedVariants
    };

    try {
      const response = await fetch("http://127.0.0.1:8001/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Download failed on server");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CAIE_${selectedSubject}_Papers.zip`;
      link.click();
    } catch (error) {
      alert("An error occurred while downloading. Check the terminal.");
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  // --- 5. THE UI (Tailwind CSS) ---
  if (isLoading) return <div className="flex justify-center items-center h-screen bg-gray-900 text-white text-2xl">Connecting to Server...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 flex justify-center items-start pt-20">
      <div className="max-w-2xl w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
        <h1 className="text-3xl font-bold mb-8 text-blue-400">Resourza Paper Fetcher</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">Select Subject</label>
          <select 
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setStartYear(""); 
              setEndYear("");
              setSelectedPapers([]);
              setSelectedVariants(["All"]); // Reset variants when changing subjects
            }}
          >
            <option value="">-- Choose a Syllabus --</option>
            {Object.keys(database).map(code => (
              <option key={code} value={code}>
                {code} - {database[code].name}
              </option>
            ))}
          </select>
        </div>

        {currentSubjectData && (
          <div className="space-y-6 animate-fade-in-down">
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-300">Start Year</label>
                <select className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white" value={startYear} onChange={(e) => setStartYear(e.target.value)}>
                  <option value="">Select...</option>
                  {availableYears.map(year => <option key={year} value={year}>20{year}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-300">End Year</label>
                <select className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white" value={endYear} onChange={(e) => setEndYear(e.target.value)}>
                  <option value="">Select...</option>
                  {availableYears.map(year => <option key={year} value={year}>20{year}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3 text-gray-300">Select Components</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentSubjectData.components.map(comp => (
                  <label key={comp.paper} className="flex items-center space-x-3 bg-gray-700 p-3 rounded-lg cursor-pointer hover:bg-gray-600 transition">
                    <input type="checkbox" className="w-5 h-5 text-blue-500 rounded bg-gray-800 border-gray-500" checked={selectedPapers.includes(comp.paper)} onChange={() => handlePaperToggle(comp.paper)}/>
                    <span className="text-sm">Paper {comp.paper}: {comp.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* NEW: VARIANT SELECTOR ROW */}
           {/* NEW: DYNAMIC VARIANT SELECTOR ROW */}
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-300">Select Variants</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Dynamically read variants from DB, or default to 1, 2, 3 if not specified */}
                {["All", ...(currentSubjectData.variants || ["1", "2", "3"])].map(variant => (
                  <label key={variant} className="flex items-center space-x-3 bg-gray-700 p-3 rounded-lg cursor-pointer hover:bg-gray-600 transition">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-blue-500 rounded bg-gray-800 border-gray-500"
                      checked={selectedVariants.includes(String(variant))}
                      onChange={() => handleVariantToggle(String(variant))}
                    />
                    <span className="text-sm">{variant === "All" ? "All Variants" : `Variant ${variant}`}</span>
                  </label>
                ))}
              </div>
            </div>

            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className={`w-full mt-6 p-4 rounded-lg font-bold text-lg transition-all ${
                isDownloading ? "bg-gray-600 text-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/30"
              }`}
            >
              {isDownloading ? "Scraping & Zipping (Please Wait)..." : "Download Past Papers"}
            </button>

          </div>
        )}
      </div>
    </div>
  );
}

export default App;