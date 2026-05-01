import React, { useEffect, useState } from 'react';
import Icons from '../components/Icons';

export function Settings() {
  const [settings, setSettings] = useState({
    language: 'en',
    notifications: true,
    autoConfirm: false,
    latencyTarget: 450,
    workingHoursStart: 9,
    workingHoursEnd: 17,
  });
  const [vapiConnected, setVapiConnected] = useState(false);
  const [vapiPhoneConnected, setVapiPhoneConnected] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  async function fetchHealth() {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setVapiConnected(data.services?.vapi || false);
      setVapiPhoneConnected(data.services?.vapiPhoneNumber || false);
      setSupabaseConnected(data.services?.supabase || false);
    } catch (err) {
      console.error('Failed to fetch health:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-settings">
      <div className="settings-grid">
        <div className="panel settings-panel">
          <div className="panel-header compact">
            <h3 className="panel-title">General Settings</h3>
          </div>
          <div className="panel-body">
            <div className="setting-row">
              <div className="setting-info">
                <label>Default Language</label>
                <p>Primary language for voice agent responses</p>
              </div>
              <select 
                value={settings.language}
                onChange={(e) => setSettings({...settings, language: e.target.value})}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
              </select>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <label>Latency Target (ms)</label>
                <p>Target response time for voice agent</p>
              </div>
              <input 
                type="number" 
                value={settings.latencyTarget}
                onChange={(e) => setSettings({...settings, latencyTarget: parseInt(e.target.value)})}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <label>Working Hours</label>
                <p>Appointment booking window</p>
              </div>
              <div className="time-range">
                <input 
                  type="number" 
                  value={settings.workingHoursStart}
                  onChange={(e) => setSettings({...settings, workingHoursStart: parseInt(e.target.value)})}
                />
                <span>to</span>
                <input 
                  type="number" 
                  value={settings.workingHoursEnd}
                  onChange={(e) => setSettings({...settings, workingHoursEnd: parseInt(e.target.value)})}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel settings-panel">
          <div className="panel-header compact">
            <h3 className="panel-title">Notifications</h3>
          </div>
          <div className="panel-body">
            <div className="setting-row toggle">
              <div className="setting-info">
                <label>Push Notifications</label>
                <p>Receive alerts for new appointments</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={settings.notifications}
                  onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            <div className="setting-row toggle">
              <div className="setting-info">
                <label>Auto-Confirm</label>
                <p>Automatically confirm appointments without patient confirmation</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={settings.autoConfirm}
                  onChange={(e) => setSettings({...settings, autoConfirm: e.target.checked})}
                />
                <span className="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="panel settings-panel">
          <div className="panel-header compact">
            <h3 className="panel-title">Integrations</h3>
          </div>
          <div className="panel-body">
            <div className="integration-row">
              <div className="integration-info">
                <Icons.Phone />
                <div>
                  <strong>Vapi Number</strong>
                  <p>Voice call integration and phone line</p>
                </div>
              </div>
              {loading ? (
                <span className="integration-status pending">Checking...</span>
              ) : vapiConnected && vapiPhoneConnected ? (
                <span className="integration-status available">Connected</span>
              ) : (
                <span className="integration-status pending">Not Connected</span>
              )}
            </div>

            <div className="integration-row">
              <div className="integration-info">
                <Icons.Activity />
                <div>
                  <strong>Vapi Campaigns</strong>
                  <p>Outbound campaign calls</p>
                </div>
              </div>
              <span className="integration-status pending">Not Connected</span>
            </div>

            <div className="integration-row">
              <div className="integration-info">
                <Icons.FileText />
                <div>
                  <strong>Supabase</strong>
                  <p>Database and authentication</p>
                </div>
              </div>
              {loading ? (
                <span className="integration-status pending">Checking...</span>
              ) : supabaseConnected ? (
                <span className="integration-status available">Connected</span>
              ) : (
                <span className="integration-status pending">Not Connected</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
