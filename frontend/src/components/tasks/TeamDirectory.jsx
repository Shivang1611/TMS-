import { Users, ArrowLeft, ArrowRight, FolderKanban, Plus } from 'lucide-react';

export default function TeamDirectory({ teams = [], selectedProjectName, onSelectTeam, onBack }) {
  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl border border-surface-200 shadow-sm font-sans w-full">
      {/* Header & Breadcrumb */}
      <div className="flex items-center justify-between border-b border-surface-100 pb-4">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-surface-500 hover:text-surface-900 transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Projects
          </button>
          <h2 className="text-xl font-extrabold text-surface-900 flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary-600" />
            {selectedProjectName ? `${selectedProjectName} — Teams` : 'Project Teams'}
          </h2>
        </div>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
          {teams.length} team(s)
        </span>
      </div>

      <p className="text-xs text-surface-500 font-medium">
        Select a team workspace below to view its active members and individual task logs:
      </p>

      {/* Teams Grid Cards — Full Width Multi-Column Grid */}
      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-200 p-8 text-center text-xs text-surface-400 italic">
          No dedicated teams found for this workspace project. All organization teams are available.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((t) => (
            <div
              key={t._id}
              onClick={() => onSelectTeam(t._id)}
              className="group cursor-pointer rounded-xl border border-surface-200 bg-surface-50/50 p-4 hover:bg-white hover:border-amber-400 hover:shadow-md transition-all space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900 font-bold text-sm">
                    👥
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-surface-900 group-hover:text-amber-800 transition-colors truncate" title={t.name}>
                      {t.name}
                    </h3>
                    <p className="text-[11px] text-surface-400 truncate">{t.department?.name || 'Department Team'}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-surface-400 group-hover:translate-x-1 group-hover:text-amber-700 transition-all" />
              </div>

              {t.description && (
                <p className="text-xs text-surface-500 line-clamp-2">{t.description}</p>
              )}

              <div className="flex items-center justify-between text-[11px] text-surface-500 pt-2 border-t border-surface-200/60 font-medium">
                <span>View People / Members</span>
                <span className="text-amber-800 font-bold">Select Team →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
