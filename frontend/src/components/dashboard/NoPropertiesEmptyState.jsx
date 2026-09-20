import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import './NoPropertiesEmptyState.css';

export default function NoPropertiesEmptyState() {
  return (
    <div className="no-properties-empty-state glass-card">
      <div className="no-properties-empty-icon"><TrendingUp size={30} /></div>
      <h2>No properties listed yet</h2>
      <p>Once you create your first listing, we'll track its calendar availability, bookings, and performance metrics here.</p>
      <Link to="/dashboard/listings" className="no-properties-empty-action">
        Create your first listing
      </Link>
    </div>
  );
}
