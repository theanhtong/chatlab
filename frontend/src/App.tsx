import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-purple-500 selection:text-white">
      <div className="max-w-md w-full space-y-8 text-center bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl transition-all duration-300 hover:border-purple-500/50">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
            <span className="text-3xl">⚛️</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            ChatLab
          </h1>
          <p className="text-slate-400 text-sm">
            React + Vite + Tailwind CSS v4 setup successfully compiled.
          </p>
        </div>

        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 space-y-2 text-left">
          <p className="text-xs text-slate-500 font-mono">
            // Test HMR
          </p>
          <p className="text-sm text-slate-300">
            Edit <code className="text-purple-400 font-mono font-medium">src/App.tsx</code> to start building.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-medium rounded-xl shadow-lg shadow-purple-600/20 transition-all duration-200 cursor-pointer"
          >
            Count is {count}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
