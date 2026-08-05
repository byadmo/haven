import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/lib/uiScale' // applies saved UI scale before first paint

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)