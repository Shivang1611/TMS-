import { useState, useMemo } from 'react';
import { CheckCircle2, Award, Clock, AlertTriangle, Sparkles, X, ChevronRight } from 'lucide-react';
import { getInitials } from '../../utils/helpers';

const SCOPES = [
  { id: 'Half Day', label: 'Half Day', points: 10, hours: '3–4 hrs', desc: 'Substantial half-day work deliverable' },
  { id: 'Full Day', label: 'Full Day', points: 20, hours: '6–8 hrs', desc: 'Major deliverable taking full workday' },
  { id: 'Quick', label: 'Quick Task', points: 5, hours: '< 2 hrs', desc: 'Minor fix, update, or quick ticket' },
  { id: 'Multi-Day', label: 'Multi-Day', points: 35, hours: '> 8 hrs', desc: 'Extensive multi-day milestone' },
];

const RATINGS = [
  { id: 'Outstanding', label: 'Outstanding', mult: 1.2, badge: '★★★', desc: 'Exceeded expected quality (+20% bonus)' },
  { id: 'Good', label: 'Good (Standard)', mult: 1.0, badge: '★★', desc: 'Met all requirements cleanly' },
  { id: 'Needs Polish', label: 'Needs Polish', mult: 0.75, badge: '★', desc: 'Completed with minor defects (-25%)' },
];

const PRIORITY_MULT = {
  Critical: 1.4,
  High: 1.2,
  Medium: 1.0,
  Low: 0.8,
};

export default function TaskDoneModal({ isOpen, onClose, task, onConfirm, isPending }) {
  if (!isOpen || !task) return null;

  // Derive initial scope from task or estimated effort
  const defaultScope = task.workScope || (
    task.estimatedEffort >= 6 ? 'Full Day' :
    task.estimatedEffort > 0 && task.estimatedEffort <= 2 ? 'Quick' :
    'Half Day'
  );

  const [workScope, setWorkScope] = useState(defaultScope);
  const [adminRating, setAdminRating] = useState(task.adminRating || 'Good');
  const [useCustomMarks, setUseCustomMarks] = useState(false);
  const [customMarks, setCustomMarks] = useState('');

  // Calculate live preview points
  const calculatedData = useMemo(() => {
    const scopeObj = SCOPES.find(s => s.id === workScope) || SCOPES[0];
    const ratingObj = RATINGS.find(r => r.id === adminRating) || RATINGS[1];
    const priorityMultiplier = PRIORITY_MULT[task.priority] || 1.0;

    let isOnTime = true;
    if (task.dueDate) {
      const endOfDueDate = new Date(task.dueDate);
      endOfDueDate.setUTCHours(23, 59, 59, 999);
      isOnTime = new Date() <= endOfDueDate;
    }

    const timelinessMult = isOnTime ? 1.0 : 0.7;
    const reworkMult = task.reworkNeeded ? 0.8 : 1.0;

    const computed = Math.max(1, Math.round(scopeObj.points * priorityMultiplier * ratingObj.mult * timelinessMult * reworkMult));

    return {
      basePoints: scopeObj.points,
      priorityMultiplier,
      ratingMult: ratingObj.mult,
      isOnTime,
      timelinessMult,
      computedPoints: computed,
    };
  }, [workScope, adminRating, task.priority, task.dueDate, task.reworkNeeded]);

  const finalPoints = useCustomMarks && customMarks !== '' && !isNaN(Number(customMarks))
    ? Math.max(0, Math.round(Number(customMarks)))
    : calculatedData.computedPoints;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      status: 'Done',
      workScope,
      adminRating,
      customMarks: useCustomMarks && customMarks !== '' ? Number(customMarks) : undefined,
    });
  };

  const assignees = task.assignees || [];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans overflow-y-auto"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div 
        className="w-full max-w-lg rounded-2xl border border-surface-200 bg-white shadow-2xl overflow-hidden animate-slide-in my-auto max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-surface-100 flex items-center justify-between bg-surface-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">
                Complete Task & Award Marks
              </h2>
              <p className="text-xs text-surface-500 truncate max-w-xs sm:max-w-sm">
                {task.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg text-surface-400 hover:text-surface-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1">
          {/* Assignees info */}
          {assignees.length > 0 && (
            <div className="bg-surface-50 rounded-xl p-3 border border-surface-200 flex items-center justify-between">
              <span className="text-xs font-medium text-surface-500">Marks Awarded To:</span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {assignees.map(a => (
                  <span key={a._id || a} className="inline-flex items-center gap-1 bg-white border border-surface-200 px-2 py-0.5 rounded-full text-xs font-semibold text-surface-800">
                    <span className="w-4 h-4 rounded-full bg-primary-100 text-primary-700 text-[9px] flex items-center justify-center font-bold">
                      {getInitials(a.name || 'U')}
                    </span>
                    {a.name || 'Assignee'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 1. Work Scope (Half Day vs Full Day) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-surface-600">
                1. Work Scope / Effort
              </label>
              <span className="text-[11px] text-surface-400">Determines base marks</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {SCOPES.map(scope => {
                const selected = workScope === scope.id;
                return (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => setWorkScope(scope.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      selected 
                        ? 'border-primary-600 bg-primary-50/60 ring-2 ring-primary-500/20' 
                        : 'border-surface-200 hover:bg-surface-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-surface-900">{scope.label}</span>
                      <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                        selected ? 'bg-primary-600 text-white' : 'bg-surface-200 text-surface-700'
                      }`}>
                        {scope.points} pts
                      </span>
                    </div>
                    <p className="text-[10px] text-surface-400">{scope.hours} • {scope.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Quality / Evaluation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-surface-600">
                2. Quality Rating
              </label>
              <span className="text-[11px] text-surface-400">Admin quality assessment</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {RATINGS.map(rating => {
                const selected = adminRating === rating.id;
                return (
                  <button
                    key={rating.id}
                    type="button"
                    onClick={() => setAdminRating(rating.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selected 
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20' 
                        : 'border-surface-200 hover:bg-surface-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-surface-900 truncate">{rating.label}</span>
                      <span className="text-[10px] text-amber-500 font-bold">{rating.badge}</span>
                    </div>
                    <p className="text-[10px] text-surface-400 mt-0.5">
                      {rating.mult > 1 ? `+${Math.round((rating.mult - 1) * 100)}%` : rating.mult < 1 ? `-${Math.round((1 - rating.mult) * 100)}%` : 'Standard'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Multiplier Details & Live Preview */}
          <div className="rounded-xl border border-surface-200 bg-surface-50/80 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-surface-600">
              <span className="inline-flex items-center gap-1 font-medium">
                Priority: <strong className="text-surface-900">{task.priority || 'Medium'}</strong>
              </span>
              <span className="font-semibold text-surface-700">{calculatedData.priorityMultiplier}x mult</span>
            </div>

            <div className="flex items-center justify-between text-xs text-surface-600">
              <span className="inline-flex items-center gap-1 font-medium">
                Timeliness: 
                <strong className={calculatedData.isOnTime ? 'text-emerald-600' : 'text-amber-600'}>
                  {calculatedData.isOnTime ? 'On Time' : 'Overdue / Late'}
                </strong>
              </span>
              <span className="font-semibold text-surface-700">
                {calculatedData.isOnTime ? '1.0x (No penalty)' : '0.7x (30% late penalty)'}
              </span>
            </div>

            {/* Live Computed Points */}
            <div className="pt-2 border-t border-surface-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-surface-500">Marks To Be Awarded</p>
                <p className="text-xs text-surface-400">
                  {calculatedData.basePoints} base × {calculatedData.priorityMultiplier} prio × {calculatedData.ratingMult} qual {calculatedData.isOnTime ? '' : '× 0.7 late'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-600">
                  +{finalPoints}
                </span>
                <span className="text-xs font-bold text-emerald-700 ml-1">pts</span>
              </div>
            </div>
          </div>

          {/* 4. Manual Custom Override (Optional) */}
          <div className="pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-surface-600 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomMarks}
                  onChange={(e) => {
                    setUseCustomMarks(e.target.checked);
                    if (e.target.checked && !customMarks) {
                      setCustomMarks(calculatedData.computedPoints.toString());
                    }
                  }}
                  className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                />
                Override with custom marks manually
              </label>
            </div>
            {useCustomMarks && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={customMarks}
                  onChange={(e) => setCustomMarks(e.target.value)}
                  placeholder="Enter exact marks (e.g. 15)"
                  className="input-field text-sm h-9 flex-1"
                  autoFocus
                />
                <span className="text-xs text-surface-400 shrink-0">points will be awarded directly</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-2 border-t border-surface-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-2 text-sm justify-center"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary flex-1 py-2 text-sm justify-center bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600"
            >
              {isPending ? 'Saving...' : `Confirm & Award ${finalPoints} pts`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
