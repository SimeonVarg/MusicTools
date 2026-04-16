import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'

const CircleOfFifths  = lazy(() => import('./tools/CircleOfFifths'))
const ChordBuilder    = lazy(() => import('./tools/ChordBuilder'))
const Oscilloscope    = lazy(() => import('./tools/Oscilloscope'))
const DrumMachine     = lazy(() => import('./tools/DrumMachine'))
const SpectrumAnalyzer = lazy(() => import('./tools/SpectrumAnalyzer'))
const GalaxyMap       = lazy(() => import('./tools/GalaxyMap'))
const EarTraining     = lazy(() => import('./tools/EarTraining'))
const PianoRoll       = lazy(() => import('./tools/PianoRoll'))
const Tuner           = lazy(() => import('./tools/Tuner'))
const AmbientEngine   = lazy(() => import('./tools/AmbientEngine'))
const IntervalKeyboard = lazy(() => import('./tools/IntervalKeyboard'))
const ProgressionAnalyzer = lazy(() => import('./tools/ProgressionAnalyzer'))
const RhythmTrainer   = lazy(() => import('./tools/RhythmTrainer'))
const ScalePractice   = lazy(() => import('./tools/ScalePractice'))
const HarmonicSeries  = lazy(() => import('./tools/HarmonicSeries'))

const Loader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a855f7', fontSize: 14 }}>
    Loading…
  </div>
)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<Layout />}>
        <Route path="/circle-of-fifths" element={<Suspense fallback={<Loader />}><CircleOfFifths /></Suspense>} />
        <Route path="/chord-builder"    element={<Suspense fallback={<Loader />}><ChordBuilder /></Suspense>} />
        <Route path="/oscilloscope"     element={<Suspense fallback={<Loader />}><Oscilloscope /></Suspense>} />
        <Route path="/drum-machine"     element={<Suspense fallback={<Loader />}><DrumMachine /></Suspense>} />
        <Route path="/spectrum"         element={<Suspense fallback={<Loader />}><SpectrumAnalyzer /></Suspense>} />
        <Route path="/galaxy-map"       element={<Suspense fallback={<Loader />}><GalaxyMap /></Suspense>} />
        <Route path="/ear-training"     element={<Suspense fallback={<Loader />}><EarTraining /></Suspense>} />
        <Route path="/piano-roll"       element={<Suspense fallback={<Loader />}><PianoRoll /></Suspense>} />
        <Route path="/tuner"            element={<Suspense fallback={<Loader />}><Tuner /></Suspense>} />
        <Route path="/ambient"          element={<Suspense fallback={<Loader />}><AmbientEngine /></Suspense>} />
        <Route path="/interval-keyboard" element={<Suspense fallback={<Loader />}><IntervalKeyboard /></Suspense>} />
        <Route path="/progression-analyzer" element={<Suspense fallback={<Loader />}><ProgressionAnalyzer /></Suspense>} />
        <Route path="/rhythm-trainer"   element={<Suspense fallback={<Loader />}><RhythmTrainer /></Suspense>} />
        <Route path="/scale-practice"   element={<Suspense fallback={<Loader />}><ScalePractice /></Suspense>} />
        <Route path="/harmonic-series"  element={<Suspense fallback={<Loader />}><HarmonicSeries /></Suspense>} />
      </Route>
    </Routes>
  )
}
