import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applySecurityHeaders } from './utils/securityHeaders'
import { applyDefaultSEO } from './utils/seo'

// Apply security headers and default SEO on application startup
applySecurityHeaders();
applyDefaultSEO();

createRoot(document.getElementById("root")!).render(<App />);
