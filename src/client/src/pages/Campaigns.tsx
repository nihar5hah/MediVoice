import React, { useEffect, useState } from 'react';
import Icons from '../components/Icons';

interface Campaign {
  id: number;
  patient_id: string;
  campaign_type: string;
  outcome: string;
  at: string;
}

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = campaigns.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'pending') return c.outcome === 'initiated' || c.outcome === 'needs_follow_up';
    if (filter === 'completed') return c.outcome === 'accepted' || c.outcome === 'rejected';
    return true;
  });

  return (
    <div className="page-campaigns">
      <div className="page-toolbar">
        <div className="filter-group">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
          <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
        </div>
        <button className="btn-primary">
          <Icons.Plus /> New Campaign
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading campaigns...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-page">
          <div className="empty-icon-large"><Icons.Phone /></div>
          <h3>No campaigns found</h3>
          <p>Create outbound reminder and follow-up campaigns here.</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign ID</th>
                <th>Patient ID</th>
                <th>Type</th>
                <th>Outcome</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((campaign) => (
                <tr key={campaign.id}>
                  <td>{campaign.id}</td>
                  <td>{campaign.patient_id}</td>
                  <td>{campaign.campaign_type}</td>
                  <td><span className={`status-pill ${campaign.outcome}`}>{campaign.outcome}</span></td>
                  <td>{new Date(campaign.at).toLocaleString('en-IN')}</td>
                  <td>
                    <button className="icon-btn"><Icons.Edit /></button>
                    <button className="icon-btn"><Icons.Trash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
