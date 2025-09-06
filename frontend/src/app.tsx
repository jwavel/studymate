import { useState, useEffect } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'

export default function App(){
  const [file, setFile] = useState<File|null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({total_users: 0, total_questions: 0, users_today: 0})

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:8000').replace('/ask', '/stats'))
      setStats(res.data)
    } catch (e) {
      console.log('Stats not available')
    }
  }

  async function onAsk(){
    if(!file || !question){ setError('Please choose a PDF and enter a question.'); return }
    setLoading(true); setError(''); setAnswer('')
    try{
      const form = new FormData()
      form.append('pdf', file)
      form.append('question', question)
      const res = await axios.post(import.meta.env.VITE_API_URL || 'http://localhost:8000/ask', form, {
        headers: { 'Content-Type':'multipart/form-data' }
      })
      setAnswer(res.data?.answer || 'No answer returned')
    }catch(e:any){
      setError(e?.response?.data?.detail || e.message || 'Failed to ask')
    }finally{
      setLoading(false)
      fetchStats()  
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink via-paper to-panel">
      {/* Header */}
      <header className="relative overflow-hidden border-b border-accent/20">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-accent2/10 to-accent3/10"></div>
        <div className="relative mx-auto max-w-7xl px-6 py-12">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.8}} className="text-center">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
              <span className="bg-gradient-to-r from-accent via-accent2 to-accent3 bg-clip-text text-transparent">
                StudyMate
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Transform your PDFs into intelligent conversations. Upload, ask, and get AI-powered answers instantly.
            </p>
            
            {/* Stats */}
            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}} className="flex justify-center gap-8 mt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{stats.total_users}</div>
                <div className="text-sm text-gray-400">Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent2">{stats.total_questions}</div>
                <div className="text-sm text-gray-400">Questions Asked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent3">{stats.users_today}</div>
                <div className="text-sm text-gray-400">Active Today</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Upload Section */}
        <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{duration:0.6}} className="mb-12">
          <div className="bg-card-bg backdrop-blur-lg border border-accent/30 rounded-3xl p-8 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Upload PDF</span>
                  <div className="mt-2 relative">
                    <input 
                      onChange={e=>setFile(e.target.files?.[0]||null)} 
                      type="file" 
                      accept="application/pdf" 
                      className="w-full rounded-xl border-2 border-dashed border-accent/50 bg-transparent px-4 py-6 text-center hover:border-accent transition-colors"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-gray-400"> Click to upload PDF</span>
                    </div>
                  </div>
                </label>
                
                <label className="block">
                  <span className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Your Question</span>
                  <textarea 
                    value={question} 
                    onChange={e=>setQuestion(e.target.value)} 
                    placeholder="What would you like to know about this document?"
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-accent/30 bg-transparent px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                  />
                </label>
                
                <button 
                  onClick={onAsk} 
                  disabled={loading || !file || !question}
                  className="w-full rounded-xl bg-gradient-to-r from-accent to-accent2 hover:from-accent2 hover:to-accent3 text-white font-bold px-6 py-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Analyzing...
                    </div>
                  ) : (
                    '🚀 Ask Question'
                  )}
                </button>
              </div>
              
              <div className="flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-32 h-32 border-4 border-accent/20 border-t-accent rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{opacity:0,y:20}} 
              animate={{opacity:1,y:0}} 
              exit={{opacity:0,y:-20}} 
              className="mb-8 rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-red-200"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Answer */}
        <AnimatePresence>
          {answer && (
            <motion.div 
              initial={{opacity:0,y:30,scale:0.95}} 
              animate={{opacity:1,y:0,scale:1}} 
              exit={{opacity:0,y:-30,scale:0.95}} 
              transition={{type:'spring', stiffness:120, damping:15}}
              className="mb-12"
            >
              <div className="relative overflow-hidden rounded-3xl border border-accent2/30 bg-gradient-to-br from-card-bg to-panel p-8 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-accent2/5 to-accent3/5"></div>
                <div className="relative">
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}} className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">💡</span>
                    <span className="text-lg font-semibold text-accent2">AI Response</span>
                  </motion.div>
                  <motion.div 
                    initial={{opacity:0}} 
                    animate={{opacity:1}} 
                    transition={{delay:0.3}} 
                    className="prose prose-invert max-w-none text-gray-200 leading-relaxed"
                  >
                    {answer}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature Catalog */}
        <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} transition={{delay:0.4}} className="grid md:grid-cols-3 gap-6 mb-12">
          <motion.div whileHover={{scale:1.05}} className="bg-card-bg backdrop-blur-lg border border-accent/20 rounded-2xl p-6 text-center hover:border-accent/40 transition-all">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-xl font-bold mb-2">AI-Powered</h3>
            <p className="text-gray-400">Advanced IBM Granite AI extracts insights from your documents</p>
          </motion.div>
          
          <motion.div whileHover={{scale:1.05}} className="bg-card-bg backdrop-blur-lg border border-accent2/20 rounded-2xl p-6 text-center hover:border-accent2/40 transition-all">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
            <p className="text-gray-400">FAISS vector search delivers instant, relevant answers</p>
          </motion.div>
          
          <motion.div whileHover={{scale:1.05}} className="bg-card-bg backdrop-blur-lg border border-accent3/20 rounded-2xl p-6 text-center hover:border-accent3/40 transition-all">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-2">Secure</h3>
            <p className="text-gray-400">Your documents are processed securely and privately</p>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-accent/20 bg-panel/50 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 mb-4 md:mb-0">
              © 2024 StudyMate. All rights reserved.
            </div>
            <div className="flex items-center gap-2 text-accent font-semibold">
              <span>Powered by</span>
              <span className="text-2xl font-black bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
                VOLANCO
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
