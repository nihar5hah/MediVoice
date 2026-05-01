import React, { useEffect, useState } from 'react';
import type { Appointment } from '../../../shared/types';
import Icons from '../components/Icons';

export function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      const response = await fetch('/api/appointments');
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = appointments.filter(a => filter === 'all' || a.status === filter);

  return (
    <div className="page-appointments">
      <div className="page-toolbar">
        <div className="filter-group">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'booked' ? 'active' : ''}`} onClick={() => setFilter('booked')}>Booked</button>
          <button className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`} onClick={() => setFilter('cancelled')}>Cancelled</button>
          <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
        </div>
        <button className="btn-primary">
          <Icons.Plus /> New Appointment
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading appointments...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-page">
          <div className="empty-icon-large"><Icons.Calendar /></div>
          <h3>No appointments found</h3>
          <p>Appointments will appear here when patients book through the voice agent.</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((appt) => (
                <tr key={appt.id}>
                  <td>{appt.patientId}</td>
                  <td>{appt.doctorName}</td>
                  <td>{appt.specialty}</td>
                  <td>{new Date(appt.startIso).toLocaleString('en-IN')}</td>
                  <td><span className={`status-pill ${appt.status}`}>{appt.status}</span></td>
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
