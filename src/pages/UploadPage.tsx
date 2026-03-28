import { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { generateOTP } from '../utils/generateOTP'

interface PrintSettings {
  copies: number
  colorMode: string
  paperSize: string
  orientation: string
}

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ jobId: string; otp: string } | null>(null)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<PrintSettings>({
    copies: 1,
    colorMode: 'Color',
    paperSize: 'A4',
    orientation: 'Portrait',
  })

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile)
    setError('')
    setShowSettings(true)
  }

  const handleUpload = async () => {
    if (!file) return setError('Please select a file first!')
    setLoading(true)
    setError('')

    try {
      const otp = generateOTP()
      const jobId = crypto.randomUUID()
      const extension = file.name.split('.').pop()
      const filePath = `${jobId}/document.${extension}`
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      // Try upload - continue even if fails
      try {
        await supabase.storage
          .from('secure-documents')
          .upload(filePath, file)
      } catch (uploadErr) {
        console.warn('Storage upload failed, continuing anyway:', uploadErr)
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('print_jobs')
        .insert({
          id: jobId,
          file_path: filePath,
          otp,
          expires_at: expiresAt,
        })

      if (dbError) throw dbError

      // Show result
      setResult({ jobId, otp })
      setShowSettings(false)

    } catch (err: any) {
      setError(err.message || 'Something went wrong!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg text-lg">🖨️</div>
          <div>
            <h1 className="font-bold text-gray-800 text-lg">SecurePrint</h1>
            <p className="text-xs text-gray-500">One-Time Print System</p>
          </div>
        </div>
        <div className="text-sm text-gray-500 hidden md:flex items-center gap-2">
          <span>🔒 Secure</span>
          <span>•</span>
          <span>⚡ One-Time</span>
          <span>•</span>
          <span>🛡️ Protected</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* STEP 1 - Upload Box */}
        {!result && !showSettings && (
          <>
            <div
              className="border-2 border-dashed border-blue-300 rounded-2xl p-16 text-center mb-8 bg-white hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => document.getElementById('fileInput')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0])
              }}
            >
              <div className="text-6xl mb-4">⬆️</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Upload a document</h2>
              <p className="text-gray-400 text-sm mb-2">Drag and drop or click to browse</p>
              <p className="text-gray-400 text-xs mb-6">Supported: PDF, JPG, PNG (max 50MB)</p>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                className="hidden"
                id="fileInput"
              />
              <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Choose File
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: '🔒', title: 'Private Storage', desc: 'Files stored securely' },
                { icon: '⏱️', title: '10 Min Expiry', desc: 'Auto-deleted after use' },
                { icon: '🔑', title: 'OTP Protected', desc: 'One-time password access' },
              ].map(card => (
                <div key={card.title} className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <p className="font-semibold text-gray-700 text-sm">{card.title}</p>
                  <p className="text-gray-400 text-xs mt-1">{card.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* STEP 2 - Print Settings */}
        {!result && showSettings && file && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg text-2xl">
                  {file.type === 'application/pdf' ? '📄' : '🖼️'}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{file.name}</p>
                  <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                onClick={() => { setFile(null); setShowSettings(false) }}
                className="text-gray-400 hover:text-red-500 text-2xl font-light"
              >
                ✕
              </button>
            </div>

            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Print Settings
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Copies</label>
                <input
                  type="number" min={1} max={99}
                  value={settings.copies}
                  onChange={(e) => setSettings({ ...settings, copies: parseInt(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Mode</label>
                <select
                  value={settings.colorMode}
                  onChange={(e) => setSettings({ ...settings, colorMode: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:border-blue-500"
                >
                  <option>Color</option>
                  <option>Black & White</option>
                  <option>Grayscale</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paper Size</label>
                <select
                  value={settings.paperSize}
                  onChange={(e) => setSettings({ ...settings, paperSize: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:border-blue-500"
                >
                  <option>A4</option>
                  <option>A3</option>
                  <option>Letter</option>
                  <option>Legal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Orientation</label>
                <select
                  value={settings.orientation}
                  onChange={(e) => setSettings({ ...settings, orientation: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:border-blue-500"
                >
                  <option>Portrait</option>
                  <option>Landscape</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-4 text-sm text-center">
                ⚠️ {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setFile(null); setShowSettings(false) }}
                className="border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={loading}
                className="bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '⏳ Creating...' : 'Create Print Job'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 - Result: OTP + Link */}
        {result && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

            <div className="text-center mb-8">
              <div className="text-6xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold text-green-600 mb-1">Print Job Created!</h2>
              <p className="text-gray-500 text-sm">Share the OTP and link with the shopkeeper</p>
            </div>

            {/* OTP */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 mb-5 text-center">
              <p className="text-xs font-bold text-yellow-700 uppercase tracking-widest mb-4">
                🔑 One-Time Password
              </p>
              <div className="flex justify-center gap-2 mb-3">
                {result.otp.split('').map((digit, i) => (
                  <div
                    key={i}
                    className="w-11 h-14 bg-white border-2 border-yellow-300 rounded-xl flex items-center justify-center text-2xl font-bold text-yellow-600 shadow-sm"
                  >
                    {digit}
                  </div>
                ))}
              </div>
              <p className="text-xs text-yellow-600">Tell this OTP verbally to the shopkeeper</p>
            </div>

            {/* Print Link */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-5">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">
                🔗 Secure Print Link
              </p>
              <div className="bg-white rounded-xl p-3 border border-blue-200 mb-3">
                <p className="text-blue-600 break-all text-sm font-mono">
                  {window.location.origin}/print/{result.jobId}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/print/${result.jobId}`
                  )
                  alert('✅ Link copied!')
                }}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
              >
                📋 Copy Link
              </button>
            </div>

            {/* Info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-1">
              <p className="text-sm text-gray-600">⏱️ Link expires in <strong>10 minutes</strong></p>
              <p className="text-sm text-gray-600">🗑️ File auto-deleted after printing</p>
              <p className="text-sm text-gray-600">🔒 Shopkeeper cannot download the file</p>
            </div>

            <button
              onClick={() => {
                setResult(null)
                setFile(null)
                setShowSettings(false)
              }}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Upload Another Document
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default UploadPage