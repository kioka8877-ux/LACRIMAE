// Design philosophy: Salon Noir — a fluid, rounded island that mutates based on the event state.

import { useState } from "react";
import { 
  ChevronDown, 
  History, 
  Calendar, 
  AlertCircle, 
  X,
  Users,
  CheckCircle2,
  Clock
} from "lucide-react";

type SeatRoomState = "live" | "menu";

interface SeatRoomControlProps {
  isLive?: boolean;
  eventName: string;
  stats?: {
    present: number;
    total: number;
    rate: number;
  };
  onNavigate?: (path: string) => void;
}

export function SeatRoomControl({ 
  isLive = true, 
  eventName, 
  stats = { present: 145, total: 200, rate: 72.5 },
  onNavigate 
}: SeatRoomControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className={`seatroom-island ${isOpen ? "seatroom-island--open" : ""}`}>
      <button 
        className={`seatroom-trigger ${isLive ? "seatroom-trigger--live" : ""}`}
        onClick={toggleOpen}
      >
        <div className="seatroom-trigger__content">
          {isLive && <span className="live-indicator"><span className="live-indicator__dot" /> EN DIRECT</span>}
          <span className="seatroom-trigger__label">SEATROOM</span>
          {isOpen ? <X size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {isOpen && (
        <div className="seatroom-dropdown reveal">
          {isLive ? (
            <div className="seatroom-live-view">
              <div className="seatroom-header">
                <p className="eyebrow">ÉVÉNEMENT EN COURS</p>
                <h3>{eventName}</h3>
                <p className="seatroom-meta">Le Grand Bal · 21 sept. 2026 · Paris</p>
              </div>
              
              <div className="seatroom-stats">
                <div className="seatroom-stat-row">
                  <div className="seatroom-stat-item">
                    <Users size={16} className="gold-text" />
                    <strong>{stats.present} / {stats.total}</strong>
                    <span>Invités arrivés</span>
                  </div>
                  <div className="seatroom-stat-item">
                    <CheckCircle2 size={16} className="success-text" />
                    <strong>{stats.rate}%</strong>
                    <span>Taux de présence</span>
                  </div>
                </div>
                <div className="seatroom-progress-bar">
                  <div className="seatroom-progress-fill" style={{ width: `${stats.rate}%` }} />
                </div>
              </div>

              <div className="seatroom-actions">
                <button className="button button--danger button--full" onClick={() => onNavigate?.("Anomalies")}>
                  <AlertCircle size={15} /> Signaler une anomalie
                </button>
              </div>
            </div>
          ) : (
            <div className="seatroom-menu-view">
              <p className="eyebrow">NAVIGATION GÉNÉRALE</p>
              <nav className="seatroom-nav">
                <button className="seatroom-nav-item" onClick={() => onNavigate?.("Agenda")}>
                  <Calendar size={18} />
                  <div>
                    <strong>Agenda</strong>
                    <span>Événements futurs</span>
                  </div>
                </button>
                <button className="seatroom-nav-item" onClick={() => onNavigate?.("Historique")}>
                  <History size={18} />
                  <div>
                    <strong>Historique</strong>
                    <span>Événements passés</span>
                  </div>
                </button>
                <button className="seatroom-nav-item" onClick={() => onNavigate?.("Statistiques")}>
                  <Clock size={18} />
                  <div>
                    <strong>Statistiques</strong>
                    <span>Analyses globales</span>
                  </div>
                </button>
              </nav>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
