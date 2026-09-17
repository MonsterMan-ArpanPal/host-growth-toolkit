import { Bell, ChevronDown } from 'lucide-react'

function Header({ currentProperty = "Oceanview Villa", properties = ["Oceanview Villa", "Downtown Loft"] }) {
  return (
    <header className="header">
      <div className="header-left">
      </div>
      
      <div className="header-right">
        <div className="property-selector">
          <span className="property-name">{currentProperty}</span>
          <ChevronDown size={16} style={{ color: "var(--gray-400)" }} />
        </div>
        <button className="icon-btn notification-btn">
          <Bell size={20} />
        </button>
      </div>
    </header>
  )
}

export default Header
