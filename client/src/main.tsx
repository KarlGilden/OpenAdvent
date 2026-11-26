import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AdventPage } from './components/advent-pages'
import './styles/global.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Unable to find the application root')
}

const path = window.location.pathname.replace(/\/$/, '')
const isAdventPage = path === '/advent' || path === '/advent/new' || path === '/advent/join'

createRoot(root).render(
  <StrictMode>
    {isAdventPage ? <AdventPage path={path} /> : <App />}
  </StrictMode>,
)

