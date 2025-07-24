import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applySecurityHeaders } from './utils/securityHeaders'

// Apply security headers on application startup
applySecurityHeaders();

createRoot(document.getElementById("root")!).render(<App />);
