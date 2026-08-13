import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, ArrowLeft, FolderKanban, Settings, CheckSquare } from 'lucide-react';
import ManageTeamModal from '../teams/ManageTeamModal';

export default function EmployeeDirectory({ users = [], selectedProjectName, team, onSelectEmployee, onBack, isDirectAssign }) {
  const navigate = useNavigate();
  const [showManageTeam, setShowManageTeam] = useState(false);

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl border border-surface-200 shadow-sm w-full font-sans">
      {/* Header & Breadcrumb */}
      {!isDirectAssign && (
      <div className="flex items-center justify-between border-b border-surface-100 pb-4">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-surface-500 hover:text-surface-900 transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <h2 className="text-xl font-extrabold text-surface-900 flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary-600" />
            {selectedProjectName ? `${selectedProjectName} — People & Members` : 'Team Directory'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {team && (
            <button
              onClick={() => setShowManageTeam(true)}
              className="flex items-center gap-1.5 rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 text-xs font-bold text-surface-700 hover:bg-surface-100 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Manage Team
            </button>
          )}
          <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-semibold text-surface-600">
            {users.length} member(s)
          </span>
        </div>
      </div>
      )}

      {/* Employee Rows — Full Page Row Form */}
      {users.length === 0 ? (
        <p className="py-8 text-center text-surface-400 text-xs italic">No active members found in this workspace team.</p>
      ) : (
        <div className="space-y-3 font-sans text-sm">
          {users.map((u) => (
            <div
              key={u._id}
              className="group flex items-center justify-between gap-4 rounded-xl border border-surface-200 bg-surface-50/50 p-4 hover:bg-white hover:border-amber-400 hover:shadow-sm transition-all"
            >
              {/* Member Info */}
              <div
                onClick={() => onSelectEmployee(u._id)}
                className="flex items-center gap-4 cursor-pointer min-w-0 flex-1"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-900 text-sm font-extrabold shrink-0 border border-amber-200">
                  👤
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-surface-900 group-hover:text-amber-900 transition-colors">
                      {u.name}
                    </h3>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                      {u.role || 'Member'}
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 font-medium truncate mt-0.5">{u.email}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => navigate('/tasks/new', { state: { assigneeId: u._id, teamId: team?._id } })}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-2xs"
                  title={`Assign task to ${u.name}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Assign Task
                </button>
                <button
                  onClick={() => onSelectEmployee(u._id)}
                  className="flex items-center gap-1 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-xs font-bold text-surface-700 hover:bg-surface-100 hover:text-amber-900 transition-all"
                >
                  Master Tracker →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manage Team Modal */}
      {showManageTeam && team && (
        <ManageTeamModal
          team={team}
          onClose={() => setShowManageTeam(false)}
        />
      )}
    </div>
  );
}
