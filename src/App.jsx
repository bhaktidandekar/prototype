import { useState, useCallback } from 'react'
import LandingPage from './pages/LandingPage'
import SystemCheckPage from './pages/SystemCheckPage'
import ExamPage from './pages/ExamPage'
import CheatedPage from './pages/CheatedPage'

function App() {
  const [currentPage, setCurrentPage] = useState('landing')
  const [violations, setViolations] = useState([])
  const [mediaStream, setMediaStream] = useState(null)

  const navigate = useCallback((page) => {
    setCurrentPage(page)
  }, [])

  const addViolation = useCallback((violation) => {
    setViolations(prev => {
      const updated = [...prev, { ...violation, time: new Date().toLocaleTimeString() }]
      if (updated.length > 5) {
        setCurrentPage('cheated')
      }
      return updated
    })
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onStart={() => navigate('systemcheck')} />
      case 'systemcheck':
        return (
          <SystemCheckPage
            onProceed={() => navigate('exam')}
            onBack={() => navigate('landing')}
            mediaStream={mediaStream}
            setMediaStream={setMediaStream}
          />
        )
      case 'exam':
        return (
          <ExamPage
            violations={violations}
            addViolation={addViolation}
            mediaStream={mediaStream}
          />
        )
      case 'cheated':
        return <CheatedPage violations={violations} />
      default:
        return <LandingPage onStart={() => navigate('systemcheck')} />
    }
  }

  return (
    <div className="app-layout">
      <div className="app-content">
        {renderPage()}
      </div>
    </div>
  )
}

export default App
