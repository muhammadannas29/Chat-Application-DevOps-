import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#16161f',
            color: '#f0f0f8',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#4fd1c7', secondary: '#16161f' },
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: '#16161f' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
