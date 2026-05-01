import React, { useState } from 'react';
import Icons from '../components/Icons';

export function Analytics() {
  const [timeRange, setTimeRange] = useState('week');

  return (
    <div className="page-analytics">
      <div className="page-toolbar">
        <div className="filter-group">
          <button className={`filter-btn ${timeRange === 'day' ? 'active' : ''}`} onClick={() => setTimeRange('day')}>Day</button>
          <button className={`filter-btn ${timeRange === 'week' ? 'active' : ''}`} onClick={() => setTimeRange('week')}>Week</button>
          <button className={`filter-btn ${timeRange === 'month' ? 'active' : ''}`} onClick={() => setTimeRange('month')}>Month</button>
          <button className={`filter-btn ${timeRange === 'year' ? 'active' : ''}`} onClick={() => setTimeRange('year')}>Year</button>
        </div>
        <button className="btn-secondary">
          <Icons.Download /> Export
        </button>
      </div>

      <div className="analytics-grid">
        <div className="panel chart-panel">
          <div className="panel-header compact">
            <h3 className="panel-title">Conversation Volume</h3>
          </div>
          <div className="panel-body">
            <div className="empty-state">
              <Icons.BarChart />
              <p>No data available for this time range</p>
            </div>
          </div>
        </div>

        <div className="panel chart-panel">
          <div className="panel-header compact">
            <h3 className="panel-title">Language Distribution</h3>
          </div>
          <div className="panel-body">
            <div className="empty-state">
              <Icons.PieChart />
              <p>No data available for this time range</p>
            </div>
          </div>
        </div>

        <div className="panel chart-panel">
          <div className="panel-header compact">
            <h3 className="panel-title">Appointment Trends</h3>
          </div>
          <div className="panel-body">
            <div className="empty-state">
              <Icons.TrendingUp />
              <p>No data available for this time range</p>
            </div>
          </div>
        </div>

        <div className="panel chart-panel">
          <div className="panel-header compact">
            <h3 className="panel-title">Latency Metrics</h3>
          </div>
          <div className="panel-body">
            <div className="empty-state">
              <Icons.Zap />
              <p>No data available for this time range</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
