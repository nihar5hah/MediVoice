import React, { useState } from 'react';
import Icons from '../components/Icons';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  languages: string[];
  available: boolean;
}

export function Doctors() {
  const [doctors] = useState<Doctor[]>([
    { id: 'doc-rao', name: 'Dr. Rao', specialty: 'General Medicine', languages: ['English', 'Hindi'], available: true },
    { id: 'doc-mehta', name: 'Dr. Mehta', specialty: 'Cardiology', languages: ['English', 'Hindi'], available: true },
    { id: 'doc-iyer', name: 'Dr. Iyer', specialty: 'Dermatology', languages: ['English', 'Tamil'], available: true },
  ]);
  const [search, setSearch] = useState('');

  const filtered = doctors.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-doctors">
      <div className="page-toolbar">
        <div className="search-box">
          <Icons.Search />
          <input 
            type="text" 
            placeholder="Search doctors by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary">
          <Icons.Plus /> Add Doctor
        </button>
      </div>

      <div className="doctors-grid">
        {filtered.map((doctor) => (
          <div className="doctor-card" key={doctor.id}>
            <div className="doctor-card-header">
              <div className="doctor-avatar-lg" style={{ background: `linear-gradient(135deg, #0071e3, #2997ff)` }}>
                {doctor.name.split(' ').pop()?.[0]}
              </div>
              <div className="doctor-card-info">
                <h4>{doctor.name}</h4>
                <span>{doctor.specialty}</span>
              </div>
              <span className={`availability-badge ${doctor.available ? 'available' : 'busy'}`}>
                {doctor.available ? 'Available' : 'Busy'}
              </span>
            </div>
            <div className="doctor-card-body">
              <div className="doctor-meta">
                <span className="meta-label">Languages</span>
                <div className="language-tags">
                  {doctor.languages.map(lang => (
                    <span key={lang} className="lang-chip">{lang}</span>
                  ))}
                </div>
              </div>
              <div className="doctor-meta">
                <span className="meta-label">ID</span>
                <span className="meta-value">{doctor.id}</span>
              </div>
            </div>
            <div className="doctor-card-footer">
              <button className="btn-text">View Schedule</button>
              <button className="btn-text">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
