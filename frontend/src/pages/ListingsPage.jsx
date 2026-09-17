import { Home } from 'lucide-react'
import './ComingSoon.css'

function ListingsPage() {
  return (
    <div className="coming-soon-container">
      <div className="coming-soon-card">
        <div className="coming-soon-icon">
          <Home size={32} />
        </div>
        <h1 className="coming-soon-title">Listings</h1>
        <p className="coming-soon-subtitle">
          AI-powered listing optimization is coming soon.
        </p>
        <p className="coming-soon-desc">
          Get smart suggestions to improve your listing titles, descriptions, and photos.
        </p>
      </div>
    </div>
  )
}
export default ListingsPage;
