import { NavLink } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, Home, Calendar, User } from 'lucide-react'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        wayzyy<span className="brand-dot">.</span>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </NavLink>
        <NavLink to="/dashboard/pricing" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <TrendingUp size={20} />
          <span>Pricing</span>
        </NavLink>
        <NavLink to="/dashboard/listings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>Listings</span>
        </NavLink>
        <NavLink to="/dashboard/bookings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Calendar size={20} />
          <span>Bookings</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="host-profile">
          <div className="avatar">
            <User size={16} />
          </div>
          <span className="host-name">James W.</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
