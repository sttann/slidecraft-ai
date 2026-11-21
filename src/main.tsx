import { createRoot } from 'react-dom/client';
import App from './App';
import Phase1Lab from './Phase1Lab';
import './style.css';
createRoot(document.getElementById('root')!).render(new URLSearchParams(window.location.search).get('lab') === 'phase1' ? <Phase1Lab/> : <App/>);
