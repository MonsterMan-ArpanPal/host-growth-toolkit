import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, Camera, CircleAlert, Gauge, Home, Sparkles, TrendingUp } from 'lucide-react';
import { fetchPricingRecommendation, getProperties } from '../api/pricing';
import { getListings } from '../api/listings';
import NoPropertiesEmptyState from '../components/dashboard/NoPropertiesEmptyState';
import './Dashboard.css';

const completionChecks = (property) => [
  { label: 'Property name', complete: Boolean(property.name) },
  { label: 'Property details', complete: Boolean(property.property_type && property.accommodates && property.bedrooms) },
  { label: 'Location', complete: Boolean(property.location || property.host_neighbourhood || property.address) },
  { label: 'Photos', complete: (property.photos || []).length >= 3 },
  { label: 'Amenities', complete: (property.amenities || []).length >= 3 },
  { label: 'Highlights', complete: (property.highlights || []).length >= 3 },
  { label: 'Description', complete: Boolean(property.full_description) },
];

const healthFor = (property) => {
  const checks = completionChecks(property);
  return Math.round((checks.filter(check => check.complete).length / checks.length) * 100);
};

const healthTone = (score) => score >= 85 ? 'good' : score >= 60 ? 'watch' : 'needs-work';

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasProperties, setHasProperties] = useState(false);

  useEffect(() => {
    document.title = 'Overview | host It';
    let active = true;
    async function loadPortfolio() {
      try {
        const [properties, listings] = await Promise.all([getProperties(), getListings().catch(() => [])]);
        if (!active) return;
        setHasProperties(properties.length > 0);
        if (!properties.length) return;
        const today = new Date().toISOString().slice(0, 10);
        const priceResults = await Promise.allSettled(properties.map(property => fetchPricingRecommendation(property.id, today)));
        if (!active) return;
        setPortfolio(properties.map((property, index) => {
          const listing = listings.find(item => item.id === property.id) || property;
          const pricing = priceResults[index].status === 'fulfilled' ? priceResults[index].value : null;
          const missing = completionChecks(listing).filter(check => !check.complete).map(check => check.label);
          return { ...property, ...listing, health: healthFor(listing), missing, pricing, optimalRate: pricing?.recommendedPrice ?? null, baselineRate: pricing?.priceRange?.[0] ?? property.minPrice ?? null, competitiveness: pricing?.marketPressure ?? null };
        }));
      } catch (error) {
        console.error('Failed to load portfolio insights', error);
        if (active) setHasProperties(false);
      } finally { if (active) setLoading(false); }
    }
    loadPortfolio();
    return () => { active = false; };
  }, []);

  const insights = useMemo(() => {
    const withPricing = portfolio.filter(item => Number.isFinite(item.optimalRate));
    const health = portfolio.length ? Math.round(portfolio.reduce((sum, item) => sum + item.health, 0) / portfolio.length) : 0;
    const competitivenessValues = portfolio.map(item => item.competitiveness).filter(Number.isFinite);
    const competitiveness = competitivenessValues.length ? Math.round(competitivenessValues.reduce((sum, value) => sum + value, 0) / competitivenessValues.length) : null;
    const averageRate = withPricing.length ? Math.round(withPricing.reduce((sum, item) => sum + item.optimalRate, 0) / withPricing.length) : null;
    const alerts = portfolio.flatMap(property => {
      const listingAlerts = property.missing.map(field => ({ id: `${property.id}-${field}`, icon: field === 'Photos' ? Camera : CircleAlert, tone: 'watch', title: `Complete ${field.toLowerCase()}`, detail: `${property.name} is missing ${field.toLowerCase()}, reducing its listing health score.`, action: 'Open listing', href: `/dashboard/listings/${property.id}` }));
      const pricingAlerts = property.pricing?.marketPressure >= 70 ? [{ id: `${property.id}-demand`, icon: TrendingUp, tone: 'good', title: 'High-demand dates detected', detail: `${property.name} has strong local demand. Review the recommended nightly rate.`, action: 'Review pricing', href: '/dashboard/pricing' }] : [];
      return [...listingAlerts, ...pricingAlerts];
    });
    return { health, competitiveness, averageRate, alerts };
  }, [portfolio]);

  const user = JSON.parse(localStorage.getItem('wayzyy_user') || '{}');
  const firstName = user.first_name || 'there';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  if (!loading && !hasProperties) return <div className="dashboard-container"><NoPropertiesEmptyState /></div>;

  return <div className="dashboard-container">
    <header className="dashboard-header animate-fade-in-up"><div className="dashboard-header-bg" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')" }}><div className="dashboard-header-content"><h1 className="welcome-title">{greeting}, {firstName}</h1><p className="welcome-subtitle">Your listing and pricing intelligence, ready for action.</p></div></div></header>

    <section className="stats-grid" aria-label="Portfolio intelligence">
      <MetricCard icon={<Home />} label="Overall Listing Health" value={loading ? '—' : `${insights.health}/100`} detail={loading ? 'Loading portfolio signals' : `${portfolio.length} active ${portfolio.length === 1 ? 'property' : 'properties'}`} tone={healthTone(insights.health)} />
      <MetricCard icon={<Gauge />} label="Market Competitiveness" value={loading ? '—' : insights.competitiveness === null ? 'Pending' : `${insights.competitiveness}/100`} detail={insights.competitiveness === null ? 'Awaiting local market signal' : insights.competitiveness >= 70 ? 'Strong demand position' : 'Room to improve positioning'} tone={insights.competitiveness >= 70 ? 'good' : 'watch'} />
      <MetricCard icon={<TrendingUp />} label="Average Optimal Rate" value={loading ? '—' : insights.averageRate === null ? 'Pending' : `£${insights.averageRate}`} detail={insights.averageRate === null ? 'Pricing engine is calculating' : 'Today’s dynamic recommendation'} tone="good" />
      <MetricCard icon={<CircleAlert />} label="Active Optimization Alerts" value={loading ? '—' : insights.alerts.length} detail={loading ? 'Checking listings' : insights.alerts.length ? 'Prioritised actions ready' : 'Your portfolio is on track'} tone={insights.alerts.length ? 'watch' : 'good'} />
    </section>

    <div className="dashboard-main-content">
      <section className="section-card animate-fade-in-up stagger-5"><div className="section-header"><h2 className="section-title"><BarChart3 size={19} /> Portfolio Health Breakdown</h2><span className="badge">{portfolio.length}</span></div><div className="portfolio-list">{loading ? <DashboardSkeleton rows={3} /> : portfolio.map(property => <a className="portfolio-item" key={property.id} href={`/dashboard/listings/${property.id}`}><div className={`portfolio-score ${healthTone(property.health)}`}><strong>{property.health}</strong><span>health</span></div><div className="portfolio-info"><strong>{property.name}</strong><span>{property.missing.length ? `${property.missing.length} completion item${property.missing.length === 1 ? '' : 's'} left` : 'Listing complete'}</span></div><div className="portfolio-rate"><span>Baseline rate</span><strong>{property.baselineRate ? `£${Math.round(property.baselineRate)}` : 'Pending'}</strong></div><ArrowRight size={16} className="portfolio-arrow" /></a>)}</div></section>
      <section className="section-card animate-fade-in-up stagger-6"><div className="section-header"><h2 className="section-title"><Sparkles size={19} /> AI Recommendations</h2></div><div className="recommendation-list">{loading ? <DashboardSkeleton rows={3} /> : insights.alerts.slice(0, 4).map(alert => { const Icon = alert.icon; return <a className={`recommendation-item ${alert.tone}`} key={alert.id} href={alert.href}><div className="recommendation-icon"><Icon size={17} /></div><div><strong>{alert.title}</strong><p>{alert.detail}</p><span>{alert.action} <ArrowRight size={13} /></span></div></a>; })}{!loading && insights.alerts.length === 0 && <p className="dashboard-empty-copy">No urgent actions. Your listings and pricing signals look healthy.</p>}</div><a href="/dashboard/pricing" className="view-all-link">Open Pricing Intelligence <ArrowRight size={14} /></a></section>
    </div>

    <section className="quick-actions-section animate-fade-in-up stagger-6"><div className="quick-actions-grid"><QuickAction href="/dashboard/pricing" icon={<TrendingUp className="action-icon" />} title="Review pricing" /><QuickAction href="/dashboard/calendar" icon={<Gauge className="action-icon" />} title="Manage availability" /><QuickAction href="/dashboard/listings" icon={<Sparkles className="action-icon" />} title="Optimise listings" /></div></section>
  </div>;
};

function MetricCard({ icon, label, value, detail, tone }) { return <div className={`stat-card animate-fade-in-up metric-${tone}`}><div className="metric-icon">{icon}</div><span className="stat-label">{label}</span><span className="stat-value">{value}</span><span className="metric-detail">{detail}</span></div>; }
function QuickAction({ href, icon, title }) { return <a href={href} className="action-card"><div className="action-icon-wrapper">{icon}</div><div className="action-content"><span className="action-title">{title}</span></div><ArrowRight className="action-arrow" /></a>; }
function DashboardSkeleton({ rows }) { return Array.from({ length: rows }, (_, index) => <div className="dashboard-row-skeleton" key={index}><span className="skeleton" /><span className="skeleton" /></div>); }

export default Dashboard;
