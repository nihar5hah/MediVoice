import React, { useEffect, useState } from 'react';
import Icons from '../components/Icons';

interface Patient {
  patient_id: string;
  language_preference: string;
  preferences: Record<string, unknown>;
  history: string[];
  updated_at: string;
}

export function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  async function fetchPatients() {
    try {
      const response = await fetch('/api/patients');
      const data = await response.json();
      setPatients(data.patients || []);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = patients.filter(p => 
    p.patient_id.toLowerCase().includes(search.toLowerCase()) ||
    (p.language_preference && p.language_preference.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-patients">
      <div className="page-toolbar">
        <div className="search-box">
          <Icons.Search />
          <input 
            type="text" 
            placeholder="Search patients by ID or language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary">
          <Icons.Plus /> Add Patient
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading patients...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-page">
          <div className="empty-icon-large"><Icons.Users /></div>
          <h3>No patients found</h3>
          <p>Patients will appear here when they interact with the voice agent.</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Language</th>
                <th>Preferences</th>
                <th>History Count</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => (
                <tr key={patient.patient_id}>
                  <td>{patient.patient_id}</td>
                  <td><span className="lang-chip">{patient.language_preference}</span></td>
                  <td>{Object.keys(patient.preferences || {}).length} prefs</td>
                  <td>{(patient.history || []).length} entries</td>
                  <td>{new Date(patient.updated_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    <button className="icon-btn"><Icons.Edit /></button>
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
