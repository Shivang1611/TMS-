import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, projectApi, userApi, teamApi } from '../api/api';
import TaskCard from '../components/tasks/TaskCard';
import TaskTable from '../components/tasks/TaskTable';
import TaskFilters from '../components/tasks/TaskFilters';
import MasterTaskTracker from '../components/tasks/MasterTaskTracker';
import EmployeeDirectory from '../components/tasks/EmployeeDirectory';
import TeamDirectory from '../components/tasks/TeamDirectory';
import { useAuth } from '../context/AuthContext';
import {
  Filter, List, Plus, ChevronLeft, ChevronRight, User, Users,
  LayoutGrid, Table2, Calendar, LayoutList, FolderKanban, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('taskViewMode') || 'workspaces');
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // 4-Level Hierarchical Navigation State:
  // Level 1: Projects Overview
  // Level 2: Teams in Project
  // Level 3: People in Team
  // Level 4: Employee Master Tracker
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedAssigneeUser, setSelectedAssigneeUser] = useState(null);

  const pageSize = 50;
  const queryClient = useQueryClient();

  const canCreate = ['Founder', 'Admin', 'Manager', 'Team Lead'].includes(user?.role);

  const params = {
    ...filters,
    page,
    pageSize,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
  };

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'active'],
    queryFn: () => projectApi.list({ status: 'Active' }),
  });
  const projects = projectsData?.data || [];

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamApi.list(),
  });
  const teamsList = teamsData?.data || [];

  const { data: usersData } = useQuery({
    queryKey: ['users', 'active'],
    queryFn: () => userApi.list({}),
  });
  const users = usersData?.data || [];

  const bulkUpdateMutation = useMutation({
    mutationFn: (data) => taskApi.bulkUpdateStatus(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedIds(new Set());
      if (res.data) {
        toast.success(res.message || `${res.data?.updated || 0} task(s) updated`);
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Bulk update failed'),
  });

  const handleBulkAction = useCallback(({ action, status, ids }) => {
    if (action === 'bulkStatus' && status && ids.size > 0) {
      bulkUpdateMutation.mutate({ taskIds: Array.from(ids), status });
    }
  }, [bulkUpdateMutation]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', params],
    queryFn: () => taskApi.list(params),
  });

  const tasks = data?.data || [];

  const selectedProject = projects.find((p) => p._id === selectedProjectId);
  const selectedTeam = teamsList.find((t) => t._id === selectedTeamId);
  const selectedEmployeeUser = users.find((u) => u._id === selectedAssigneeUser);

  // Filter members of selected team
  const teamMembers = selectedTeam
    ? users.filter((u) => u.teams?.includes(selectedTeam._id) || selectedTeam.teamLeads?.some((tl) => tl._id === u._id))
    : users;

  return (
    <div className="space-y-6 font-sans">
      {/* ─── Interactive Breadcrumb Bar ───────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-surface-200 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-surface-600">
          <button
            onClick={() => { setSelectedProjectId(null); setSelectedTeamId(null); setSelectedAssigneeUser(null); setViewMode('workspaces'); localStorage.setItem('taskViewMode', 'workspaces'); }}
            className={`hover:text-surface-900 transition-colors ${!selectedProjectId && !selectedTeamId && !selectedAssigneeUser && viewMode === 'workspaces' ? 'text-surface-900 font-bold' : ''}`}
          >
            Tasks & Workspaces
          </button>

          {selectedProject && (
            <>
              <span>/</span>
              <button
                onClick={() => { setSelectedTeamId(null); setSelectedAssigneeUser(null); }}
                className={`hover:text-surface-900 transition-colors ${selectedProjectId && !selectedTeamId && !selectedAssigneeUser ? 'text-surface-900 font-bold' : ''}`}
              >
                Project: {selectedProject.name}
              </button>
            </>
          )}

          {selectedTeam && (
            <>
              <span>/</span>
              <button
                onClick={() => setSelectedAssigneeUser(null)}
                className={`hover:text-surface-900 transition-colors ${selectedTeamId && !selectedAssigneeUser ? 'text-surface-900 font-bold' : ''}`}
              >
                Team: {selectedTeam.name}
              </button>
            </>
          )}

          {selectedEmployeeUser && (
            <>
              <span>/</span>
              <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-bold">
                👤 {selectedEmployeeUser.name}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <button onClick={() => navigate('/tasks/new')} className="btn-primary">
              <Plus className="h-4 w-4" /> New Task
            </button>
          )}
          <div className="flex overflow-hidden rounded-lg border border-surface-200">
            <button
              onClick={() => {
                setViewMode('workspaces');
                localStorage.setItem('taskViewMode', 'workspaces');
                setSelectedProjectId(null);
                setSelectedTeamId(null);
                setSelectedAssigneeUser(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors border-r border-surface-200 ${
                viewMode === 'workspaces' ? 'bg-primary-50 text-primary-700' : 'bg-white text-surface-500 hover:bg-surface-50'
              }`}
              title="Workspaces view"
            >
              <LayoutGrid className="h-4 w-4" />
              Assign Task
            </button>
            <button
              onClick={() => { setViewMode('tracker'); localStorage.setItem('taskViewMode', 'tracker'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'tracker' ? 'bg-primary-50 text-primary-700' : 'bg-white text-surface-500 hover:bg-surface-50'
              }`}
              title="Notion Master Tracker view"
            >
              <LayoutList className="h-4 w-4 text-amber-600" />
              Master Tracker
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : viewMode === 'tracker' || selectedAssigneeUser ? (
            /* Level 4: Master Task Tracker scoped to specific Employee or global if tracker view */
            <MasterTaskTracker
              tasks={tasks}
              users={users}
              selectedUser={selectedAssigneeUser}
              onSelectUser={(uId) => setSelectedAssigneeUser(uId)}
            />
          ) : selectedTeamId ? (
            /* Level 3: People / Members inside selected Team */
            <EmployeeDirectory
              users={teamMembers.length > 0 ? teamMembers : users}
              selectedProjectName={selectedTeam?.name}
              team={selectedTeam}
              onSelectEmployee={(empId) => setSelectedAssigneeUser(empId)}
              onBack={() => setSelectedTeamId(null)}
            />
          ) : selectedProjectId ? (
            /* Level 2: Teams assigned to selected Project */
            <TeamDirectory
              teams={teamsList}
              selectedProjectName={selectedProject?.name}
              onSelectTeam={(tId) => setSelectedTeamId(tId)}
              onBack={() => setSelectedProjectId(null)}
            />
          ) : (
            /* Level 1: Projects Overview Cards & Standalone Teams Cards */
            <div className="space-y-8">

              {/* Direct Teams Cards Section */}
              <div className="pt-2">
                <h2 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-amber-600" />
                  Teams
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {teamsList.map((t) => {
                    const projectForTeam = projects.find(p => p.teams?.some(pt => pt === t._id || pt._id === t._id));
                    return (
                    <div
                      key={t._id}
                      onClick={() => { setSelectedTeamId(t._id); setSelectedProjectId(null); setSelectedAssigneeUser(null); }}
                      className="group cursor-pointer rounded-2xl border border-surface-200 bg-white p-5 shadow-sm hover:border-amber-400 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="font-bold text-surface-900 group-hover:text-amber-700 transition-colors flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-base shrink-0">👥</span>
                          <span className="truncate" title={t.name}>{t.name}</span>
                        </h3>
                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 truncate max-w-[120px]" title={projectForTeam?.name || t.department?.name}>
                          {projectForTeam?.name || t.department?.name || 'Team'}
                        </span>
                      </div>
                      <p className="text-xs text-surface-500 line-clamp-2 mb-4">
                        {t.description || 'Department team workspace'}
                      </p>
                      <div className="flex items-center justify-between text-xs pt-3 border-t border-surface-100 text-surface-500 font-semibold">
                        <span className="text-amber-900">View Team People</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform text-amber-700" />
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Direct Assignees Section */}
              <div className="pt-8 border-t border-surface-200">
                <h2 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary-600" />
                  Direct Assignees
                </h2>
                <EmployeeDirectory
                  users={users}
                  isDirectAssign={true}
                  onSelectEmployee={(empId) => setSelectedAssigneeUser(empId)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
