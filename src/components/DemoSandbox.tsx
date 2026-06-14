import { useState, useEffect } from "react";
import { Sliders, X, CheckCircle2, AlertTriangle, Key, Users, Mic, Volume2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export function DemoSandbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [keyStatus, setKeyStatus] = useState<"custom" | "system" | "mock">("mock");

  // Mock states for UI visual sync
  const [mockFaces, setMockFaces] = useState<number | null>(null);
  const [mockSpeaking, setMockSpeaking] = useState<boolean | null>(null);
  const [mockVolume, setMockVolume] = useState<number>(0);

  useEffect(() => {
    // Read local API key
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("GEMINI_API_KEY") || "";
      setApiKey(saved);

      // Check key availability
      if (saved) {
        setKeyStatus("custom");
      } else {
        setKeyStatus("mock");
      }
    }
  }, []);

  const handleSaveKey = () => {
    if (typeof window !== "undefined") {
      const trimmed = apiKey.trim();
      if (trimmed) {
        localStorage.setItem("GEMINI_API_KEY", trimmed);
        setKeyStatus("custom");
        toast.success("Gemini API key saved to browser storage!");
      } else {
        localStorage.removeItem("GEMINI_API_KEY");
        setKeyStatus("mock");
        toast.info("Gemini API key cleared. Using mock fallbacks.");
      }
    }
  };

  const handleFaceChange = (count: number) => {
    if (typeof window !== "undefined") {
      (window as any).__mockFaceCount = count;
      setMockFaces(count);
      toast.success(`Simulator: Set face count to ${count}. ${count !== 1 ? "⚠️ Anomaly triggered!" : "✅ Clear."}`);
    }
  };

  const handleSpeakingChange = (active: boolean) => {
    if (typeof window !== "undefined") {
      (window as any).__mockSpeaking = active;
      (window as any).__mockVolume = active ? 0.25 : 0;
      setMockSpeaking(active);
      setMockVolume(active ? 25 : 0);
      toast.success(`Simulator: ${active ? "🎙️ Speaking detected! Video will pause." : "🎙️ Speaking stopped."}`);
    }
  };

  const handleVolumeChange = (volPercent: number) => {
    if (typeof window !== "undefined") {
      const val = volPercent / 100;
      (window as any).__mockVolume = val;
      setMockVolume(volPercent);
      if (volPercent > 7 && !mockSpeaking) {
        (window as any).__mockSpeaking = true;
        setMockSpeaking(true);
      } else if (volPercent <= 7 && mockSpeaking) {
        (window as any).__mockSpeaking = false;
        setMockSpeaking(false);
      }
    }
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      delete (window as any).__mockFaceCount;
      delete (window as any).__mockSpeaking;
      delete (window as any).__mockVolume;
      setMockFaces(null);
      setMockSpeaking(null);
      setMockVolume(0);
      toast.info("Simulator overrides cleared. Using active device input.");
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 size-14 rounded-full bg-gradient-to-tr from-primary to-accent text-white shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group glow-primary"
        title="Open Hackathon Demo Controls"
      >
        <Sliders className="size-6 group-hover:rotate-45 transition-transform duration-300" />
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-accent border border-white"></span>
        </span>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Control Panel Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-85 sm:w-96 bg-background/95 backdrop-blur-xl border-l border-border/80 shadow-2xl z-50 p-6 flex flex-col justify-between transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sliders className="size-4.5 text-accent" /> Demo Simulator
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Configure API & proctoring alerts</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Gemini API Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Key className="size-3.5 text-primary" /> Google Gemini API
            </h3>
            
            {/* Status indicators */}
            <div className="flex items-center justify-between text-xs px-3 py-2 bg-secondary/40 rounded-lg border border-border/40">
              <span className="text-muted-foreground">Active Mode:</span>
              {keyStatus === "custom" && (
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Client API Key
                </span>
              )}
              {keyStatus === "system" && (
                <span className="font-semibold text-sky-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Server env.key
                </span>
              )}
              {keyStatus === "mock" && (
                <span className="font-semibold text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="size-3.5" /> Mock Fallback
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-muted-foreground">Client API Key (Saves locally in browser)</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 rounded-md bg-input/50 border border-border px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-accent focus:border-transparent transition-all"
                />
                <button
                  onClick={handleSaveKey}
                  className="rounded-md bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2 text-xs font-medium cursor-pointer transition-all animate-none"
                >
                  Save
                </button>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              💡 To enable live AI tutor chat and dynamic lesson quizzes, paste your Google Gemini Key. You can get a free key from the{" "}
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline inline-flex items-center font-medium"
              >
                Google AI Studio
              </a>.
            </p>
          </div>

          {/* Proctoring Simulator Section */}
          <div className="space-y-4 pt-4 border-t border-border/40">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" /> Proctoring Simulator
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Test proctoring alerts without granting camera access or moving in front of the lens.
              </p>
            </div>

            {/* Simulated Face Count */}
            <div className="space-y-2">
              <label className="text-[11px] text-muted-foreground block">Simulate Detected Faces</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleFaceChange(0)}
                  className={`py-1.5 rounded text-xs font-medium border transition-all cursor-pointer ${
                    mockFaces === 0
                      ? "bg-rose-500/10 border-rose-500 text-rose-300 font-semibold"
                      : "bg-secondary/40 border-border/40 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  0 Faces
                </button>
                <button
                  onClick={() => handleFaceChange(1)}
                  className={`py-1.5 rounded text-xs font-medium border transition-all cursor-pointer ${
                    mockFaces === 1
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 font-semibold"
                      : "bg-secondary/40 border-border/40 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  1 (Clear)
                </button>
                <button
                  onClick={() => handleFaceChange(2)}
                  className={`py-1.5 rounded text-xs font-medium border transition-all cursor-pointer ${
                    mockFaces === 2
                      ? "bg-rose-500/10 border-rose-500 text-rose-300 font-semibold"
                      : "bg-secondary/40 border-border/40 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  2+ Faces
                </button>
              </div>
            </div>

            {/* Simulated Speaking Toggle */}
            <div className="flex items-center justify-between py-2 border-y border-border/30">
              <div className="space-y-0.5">
                <label className="text-[11px] text-muted-foreground block flex items-center gap-1">
                  <Mic className="size-3 text-muted-foreground" /> Simulate Speaking
                </label>
                <span className="text-[9px] text-muted-foreground/80 block">Triggers voice distraction anomaly</span>
              </div>
              <button
                onClick={() => handleSpeakingChange(mockSpeaking === true ? false : true)}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-all cursor-pointer ${
                  mockSpeaking === true
                    ? "bg-rose-500/10 border-rose-500 text-rose-300 font-semibold"
                    : "bg-secondary/40 border-border/40 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {mockSpeaking === true ? "Speaking: ON" : "Speaking: OFF"}
              </button>
            </div>

            {/* Simulated Sound Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] text-muted-foreground block flex items-center gap-1">
                  <Volume2 className="size-3 text-muted-foreground" /> Sound Input Level
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">{mockVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={mockVolume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full accent-primary bg-secondary/80 h-1 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border/60 pt-4 flex gap-2">
          <button
            onClick={handleReset}
            className="flex-1 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground py-2 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-border/40"
          >
            <RotateCcw className="size-3.5" /> Clear Overrides
          </button>
        </div>
      </aside>
    </>
  );
}
