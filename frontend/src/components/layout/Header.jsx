import { useState, useEffect } from 'react'
import { Bell, ChevronDown } from 'lucide-react'
import { getProperties } from '../../api/pricing'

function Header() {
  const [propertyName, setPropertyName] = useState('');

  useEffect(() => {
    getProperties().then(props => {
      if (props.length > 0) {
        setPropertyName(props[0].name);
      }
    });
  }, []);

  return (
    <header className="header">
      <div className="header-left">
      </div>
      
      <div className="header-right">
        {propertyName && (
          <div className="property-selector">
            <span className="property-name">{propertyName}</span>
            <ChevronDown size={16} style={{ color: "var(--gray-400)" }} />
          </div>
        )}
        <button className="icon-btn notification-btn">
          <Bell size={20} />
        </button>
      </div>
    </header>
  )
}

export default Header
