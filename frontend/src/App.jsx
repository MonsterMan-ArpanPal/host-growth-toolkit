import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import PropertySetup from './pages/PropertySetup'
import DashboardLayout from './components/layout/DashboardLayout'
import Dashboard from './pages/Dashboard'
import PricingPage from './pages/PricingPage'
import ListingsPage from './pages/ListingsPage'
import NewListingPage from './pages/NewListingPage'
import BookingsPage from './pages/BookingsPage'
import CalendarPage from './pages/CalendarPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      <Route path="/setup" element={<PropertySetup />} />
      
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="listings" element={<ListingsPage />} />
        <Route path="listings/new" element={<NewListingPage />} />
        <Route path="bookings" element={<BookingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
