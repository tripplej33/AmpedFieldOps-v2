import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initTheme } from './lib/theme'

// Initialize user theme preferences (light/dark & accent)
initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
