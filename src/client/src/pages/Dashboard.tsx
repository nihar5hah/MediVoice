import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AgentTraceStep, Appointment, VoiceTurnResponse } from '../../../shared/types';
import Icons from '../components/Icons';

const sessionId = crypto.randomUUID();

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / range) * 24}`).join(' ');
  return (
    <svg width="80" height="32" viewBox="0 0 100 32" className="sparkline">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function Dashboard() {
  const [patientId, setPatientId] = useState('');
  const [utterance, setUtterance] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'patient' | 'agent'; text: string; language?: string }>>([]);
  const [trace, setTrace] = useState<AgentTraceStep[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [latency, setLatency] = useState<number | undefined>();
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAppointments = useMemo(() => appointments.filter((a) => a.status === 'booked'), [appointments]);

  useEffect(() => {
    fetchAppointments();
    
    const SpeechRecognitionApi = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionApi) return;
    const recognition = new SpeechRecognitionApi();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    recognition.onresult = (event) => setUtterance(event.results[0]?.[0]?.transcript ?? '');
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchAppointments() {
    try {
      const response = await fetch('/api/appointments');
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    }
  }

  async function sendTurn(mode: 'inbound' | 'outbound' = 'inbound') {
    if (!utterance.trim() || !patientId.trim()) return;
    setLoading(true);
    setMessages((c) => [...c, { role: 'patient', text: utterance }]);
    try {
      const response = await fetch('/api/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, patientId, utterance, mode })
      });
      const payload = (await response.json()) as VoiceTurnResponse;
      setMessages((c) => [...c, { role: 'agent', text: payload.reply, language: payload.language }]);
      setTrace(payload.trace);
      setAppointments(payload.appointments);
      setLatency(payload.latencyMs);
      speak(payload.reply, payload.language);
    } catch (err) {
      setMessages((c) => [...c, { role: 'agent', text: 'Sorry, there was an error processing your request.' }]);
    }
    setLoading(false);
  }

  async function startCampaign() {
    if (!patientId.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/campaign/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, campaignType: 'reminder' })
      });
      const payload = await response.json();
      setMessages((c) => [...c, { role: 'agent', text: payload.prompt }]);
      setAppointments(payload.appointments ?? []);
      speak(payload.prompt, payload.patient.languagePreference);
    } catch (err) {
      setMessages((c) => [...c, { role: 'agent', text: 'Sorry, there was an error starting the campaign.' }]);
    }
    setLoading(false);
  }

  function listen() {
    if (!recognitionRef.current) return;
    setIsListening(true);
    recognitionRef.current.start();
  }

  const stats = [
    { label: 'Total Appointments', value: appointments.length.toString(), icon: Icons.Calendar, color: '#0071e3', data: [10, 15, 12, 18, 14, 20, 16, 22, 18, 25] },
    { label: 'Active Bookings', value: activeAppointments.length.toString(), icon: Icons.Check, color: '#34c759', data: [5, 8, 6, 10, 8, 12, 9, 14, 11, 16] },
    { label: 'Avg Latency', value: latency ? `${latency}ms` : '—', icon: Icons.Zap, color: '#ff9500', data: [200, 180, 220, 160, 190, 170, 210, 150, 180, 140] },
    { label: 'Conversations', value: messages.length.toString(), icon: Icons.Message, color: '#af52de', data: [2, 4, 3, 6, 5, 8, 6, 10, 8, 12] },
  ];

  return (
    <div className="dashboard-page">
      {/* Stats Row */}
      <section className="stats-grid">
        {stats.map((stat, i) => (
          <div className="stat-tile" key={i}>
            <div className="stat-tile-main">
              <div className="stat-tile-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
                <stat.icon />
              </div>
              <div className="stat-tile-info">
                <span className="stat-tile-label">{stat.label}</span>
                <span className="stat-tile-value">{stat.value}</span>
              </div>
              <Sparkline data={stat.data} color={stat.color} />
            </div>
          </div>
        ))}
      </section>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Voice Agent */}
        <div className="panel voice-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Voice Agent</h3>
              <p className="panel-subtitle">Real-time appointment scheduling</p>
            </div>
            <span className={`status-badge ${loading ? 'processing' : 'ready'}`}>
              {loading ? 'Processing...' : 'Ready'}
            </span>
          </div>

          <div className="voice-content">
            <div className="patient-input-row">
              <div className="input-group">
                <label>Patient ID</label>
                <input 
                  type="text" 
                  value={patientId} 
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="Enter patient identifier"
                />
              </div>
            </div>

            <div className="voice-input-wrap">
              <textarea
                value={utterance}
                onChange={(e) => setUtterance(e.target.value)}
                placeholder="Enter patient request or use microphone..."
                rows={3}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendTurn(); } }}
              />
              <button
                className={`mic-btn ${isListening ? 'listening' : ''}`}
                onClick={listen}
                disabled={!recognitionRef.current || isListening}
              >
                <Icons.Mic />
              </button>
            </div>

            <div className="voice-actions">
              <button className="btn-primary" onClick={() => void sendTurn()} disabled={loading || !patientId}>
                <Icons.Send /> Send Inbound
              </button>
              <button className="btn-secondary" onClick={() => void startCampaign()} disabled={loading || !patientId}>
                <Icons.Phone /> Outbound
              </button>
              <button className="btn-secondary" onClick={() => void sendTurn('outbound')} disabled={loading || !patientId}>
                Campaign Reply
              </button>
            </div>

            <div className="messages-scroll">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <Icons.Message />
                  <p>Start a conversation to interact with the AI agent</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div className={`message-row ${msg.role}`} key={i}>
                    <div className="message-meta">
                      <span className="message-sender">{msg.role === 'patient' ? 'Patient' : 'AI Agent'}</span>
                      {msg.language && <span className="lang-tag">{msg.language}</span>}
                    </div>
                    <div className="message-bubble">{msg.text}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="right-stack">
          {/* Appointments */}
          <div className="panel">
            <div className="panel-header compact">
              <h3 className="panel-title">Recent Appointments</h3>
              <Link to="/appointments" className="link-btn">View All</Link>
            </div>
            <div className="panel-body">
              {activeAppointments.length === 0 ? (
                <div className="empty-state small">
                  <Icons.Calendar />
                  <p>No active appointments</p>
                </div>
              ) : (
                <div className="appointment-list">
                  {activeAppointments.slice(0, 5).map((appt) => (
                    <div className="appointment-row" key={appt.id}>
                      <div className="appt-avatar" style={{ background: `linear-gradient(135deg, #0071e3, #2997ff)` }}>
                        {appt.doctorName.split(' ').pop()?.[0]}
                      </div>
                      <div className="appt-details">
                        <strong>{appt.doctorName}</strong>
                        <span>{appt.specialty}</span>
                        <span className="appt-time">
                          <Icons.Clock /> {new Date(appt.startIso).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="appt-status">{appt.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Trace */}
          <div className="panel">
            <div className="panel-header compact">
              <h3 className="panel-title">System Trace</h3>
              <span className="badge">{trace.length} steps</span>
            </div>
            <div className="panel-body">
              {trace.length === 0 ? (
                <div className="empty-state small">
                  <Icons.Activity />
                  <p>Agent trace will appear here</p>
                </div>
              ) : (
                <div className="trace-list">
                  {trace.map((step, i) => (
                    <div className="trace-row" key={i}>
                      <span className="trace-dot" />
                      <div className="trace-info">
                        <strong>{step.step}</strong>
                        <span>{step.detail}</span>
                        <span className="trace-time">{step.elapsedMs}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function speak(text: string, language: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-IN';
  window.speechSynthesis.speak(u);
}
