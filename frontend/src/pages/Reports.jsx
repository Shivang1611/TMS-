import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, userApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend as RechartsLegend,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { BarChart3, Users, TrendingUp, Download, X, Trophy, ChevronRight, FileText } from 'lucide-react';
import { statusConfig, getInitials } from '../utils/helpers';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import MasterTaskTracker from '../components/tasks/MasterTaskTracker';
import ScoreBadge from '../components/common/ScoreBadge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PIE_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

export default function Reports() {
  const { user } = useAuth();
  const [tab, setTab] = useState('tasks');
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [trackerModalUserId, setTrackerModalUserId] = useState(null);
  const isAdminOrManager = ['Founder', 'Admin', 'Manager'].includes(user?.role);

  const [period, setPeriod] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('');

  // Fetch all users to populate the assignee filter
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.list(),
    enabled: isAdminOrManager,
  });
  const users = usersData?.data || [];

  const { data: taskData, isLoading: taskLoading } = useQuery({
    queryKey: ['reports', 'tasks', period, selectedAssignee],
    queryFn: () => reportApi.tasks({ period, assigneeId: selectedAssignee || undefined }),
    enabled: tab === 'tasks',
  });

  const { data: workloadData, isLoading: workloadLoading } = useQuery({
    queryKey: ['reports', 'workload'],
    queryFn: () => reportApi.workload(),
    enabled: tab === 'workload',
  });

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['reports', 'projects'],
    queryFn: () => reportApi.projects(),
    enabled: tab === 'projects' && isAdminOrManager,
  });

  const taskReport = taskData?.data;
  const detailedTasks = taskReport?.detailedTasks || [];
  const workload = workloadData?.data || [];
  const projectReport = projectData?.data || [];

  const handleExportCSV = () => {
    if (!detailedTasks || detailedTasks.length === 0) return;
    const headers = ['Task Title', 'Project', 'Assigned By', 'Assigned To', 'Status', 'Priority', 'Assigned Date', 'Completed Date', 'Time Taken (Hours)'];
    const rows = detailedTasks.map((t) => [
      `"${t.title.replace(/"/g, '""')}"`,
      `"${(t.project?.name || '').replace(/"/g, '""')}"`,
      `"${(t.assignedBy || 'Admin').replace(/"/g, '""')}"`,
      `"${(t.assignedTo || 'Unassigned').replace(/"/g, '""')}"`,
      `"${t.status}"`,
      `"${t.priority}"`,
      `"${new Date(t.createdAt).toLocaleDateString()}"`,
      `"${t.completedAt ? new Date(t.completedAt).toLocaleDateString() : 'N/A'}"`,
      `"${t.durationHours != null ? t.durationHours + ' hrs' : 'N/A'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `task_report_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!taskReport?.detailedTasks || taskReport.detailedTasks.length === 0) return;
    
    const doc = new jsPDF();
    const periodLabel = period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1);
    const pageWidth = doc.internal.pageSize.width;
    
    // Header Title
    doc.setFontSize(22);
    doc.setTextColor(17, 24, 39); // surface-900
    doc.setFont('helvetica', 'bold');
    doc.text(`Task Completion Report`, 14, 22);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // surface-500
    doc.text(`Period: ${periodLabel}   |   Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    let startY = 40;

    if (selectedAssignee && users.length > 0) {
      const emp = users.find(u => u._id === selectedAssignee);
      if (emp) {
        // Calculate Metrics
        let missedDeadlines = 0;
        let pendingTasks = 0;
        let blockedTasks = 0;
        let reworkTasks = 0;

        taskReport.detailedTasks.forEach(t => {
          if (t.status === 'To Do' || t.status === 'In Progress') pendingTasks++;
          if (t.status === 'Blocked') blockedTasks++;
          if (t.status === 'In Review') reworkTasks++;

          if (t.dueDate) {
             const due = new Date(t.dueDate);
             const completed = t.completedAt ? new Date(t.completedAt) : new Date();
             if (completed > due && t.status !== 'To Do') {
                 missedDeadlines++;
             }
          }
        });
        
        let quality = "Beginner";
        if (emp.score >= 500) quality = "Elite";
        else if (emp.score >= 301) quality = "Excellent";
        else if (emp.score >= 151) quality = "Great";
        else if (emp.score >= 51) quality = "Good";

        // Employee Info section (Card)
        doc.setFillColor(255, 255, 255); // White
        doc.setDrawColor(229, 231, 235); // surface-200
        doc.roundedRect(14, 38, pageWidth - 28, 42, 4, 4, 'FD');

        doc.setFontSize(14);
        doc.setTextColor(17, 24, 39); // surface-900
        doc.setFont('helvetica', 'bold');
        doc.text(`${emp.name}`, 20, 49);
        
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128); // surface-500
        doc.setFont('helvetica', 'normal');
        doc.text(`${emp.role || 'Employee'}`, 20, 55);
        
        // Stats grid inside the card
        // Row 1
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(`Total Score:`, 80, 49);
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.text(`${emp.score || 0} pts`, 105, 49);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(`Work Quality:`, 140, 49);
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.text(`${quality}`, 165, 49);
        
        // Row 2
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(`Pending:`, 80, 57);
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.text(`${pendingTasks}`, 105, 57);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(`Blocked:`, 120, 57);
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.text(`${blockedTasks}`, 135, 57);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(`In Review:`, 150, 57);
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.text(`${reworkTasks}`, 170, 57);
        
        // Row 3 (Missed Deadlines)
        doc.setFont('helvetica', 'bold');
        if (missedDeadlines > 0) {
          doc.setTextColor(220, 38, 38); // Red-600
          doc.text(`! Missed Deadlines: ${missedDeadlines}`, 20, 72);
        } else {
          doc.setTextColor(5, 150, 105); // Emerald-600
          doc.text(`+ Missed Deadlines: ${missedDeadlines}`, 20, 72);
        }
        
        startY = 88;
      }
    }

    const tableColumn = ["Task Title", "Project", "Assigned By", "Status", "Date", "Duration/Effort"];
    const tableRows = [];

    const isFiltered = !!selectedAssignee;
    if (!isFiltered) {
       tableColumn.splice(3, 0, "Assigned To");
    }

    taskReport.detailedTasks.forEach(t => {
      const taskData = [
        t.title,
        t.project?.name || '-',
        t.assignedBy || 'Admin',
      ];
      
      if (!isFiltered) {
        taskData.push(t.assignedTo || 'Unassigned');
      }

      taskData.push(
        t.status,
        new Date(t.createdAt).toLocaleDateString(),
        t.status === 'Done' ? `${t.durationHours != null ? t.durationHours + ' hrs' : 'Completed'}` : (t.estimatedEffort ? `Est: ${t.estimatedEffort}h` : '-')
      );

      tableRows.push(taskData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      theme: 'grid',
      styles: { 
        fontSize: 9, 
        cellPadding: 4, 
        font: 'helvetica',
        lineColor: [229, 231, 235], // surface-200
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [249, 250, 251], // surface-50
        textColor: [107, 114, 128], // surface-500
        fontStyle: 'bold',
        lineColor: [229, 231, 235], // surface-200
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [17, 24, 39] // surface-900
      },
      margin: { top: 14, right: 14, bottom: 14, left: 14 }
    });
    
    doc.save(`Task_Report_${period}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const tabs = [
    { id: 'tasks', label: 'Task Completion', icon: BarChart3 },
    { id: 'workload', label: 'Workload', icon: Users },
    ...(isAdminOrManager ? [{ id: 'projects', label: 'Projects', icon: TrendingUp }] : []),
  ];

  const pieData = taskReport?.tasksByStatus?.map((s) => ({
    name: s._id,
    value: s.count,
    color: PIE_COLORS[['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'].indexOf(s._id)] || '#94a3b8',
  })) || [];

  const STATUS_ORDER = ['To Do', 'In Progress', 'In Review', 'Blocked', 'Done'];
  const STACK_COLORS = {
    'To Do': '#94a3b8',
    'In Progress': '#3b82f6',
    'In Review': '#f59e0b',
    'Done': '#10b981',
    'Blocked': '#ef4444',
  };

  const workloadChartData = workload.map((w) => {
    const entry = { name: w.assignee?.name || 'Unknown' };
    STATUS_ORDER.forEach((s) => {
      entry[s] = w.tasksByStatus?.find((t) => t.status === s)?.count || 0;
    });
    return entry;
  }).slice(0, 20);

  const topPerformers = [...(usersData?.data || [])]
    .filter(u => u.isActive !== false && u.score > 0)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {!trackerModalUserId && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Reports & Detailed Analytics</h1>
            <p className="mt-1 text-sm text-surface-500">Track tasks assigned, assigners, assignees, and completion performance</p>
          </div>

          {tab === 'tasks' && (
            <div className="flex items-center gap-3">
              {/* Period Selector Filter */}
              <div className="flex rounded-lg bg-surface-100 p-1 border border-surface-200 text-xs font-medium">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'daily', label: 'Daily (Today)' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'monthly', label: 'Monthly' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`px-3 py-1.5 rounded-md transition-all ${
                      period === p.id
                        ? 'bg-white text-primary-700 shadow-sm font-semibold'
                        : 'text-surface-600 hover:text-surface-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Employee Filter */}
              {isAdminOrManager && (
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="input-field py-1.5 text-xs font-medium bg-surface-50 h-[32px] w-40"
                >
                  <option value="">All Employees</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-2">
                <button onClick={handleExportCSV} className="btn-secondary text-xs flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
                <button onClick={handleExportPDF} className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-sm">
                  <FileText className="h-3.5 w-3.5" /> Export PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab navigation */}
      {!trackerModalUserId && (
        <div className="flex gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}>
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {trackerModalUserId && (
        <div className="space-y-4 animate-fade-in">
          <button 
            onClick={() => setTrackerModalUserId(null)}
            className="flex items-center gap-2 text-sm font-semibold text-surface-500 hover:text-surface-900 transition-colors bg-white px-4 py-2 rounded-lg border border-surface-200 shadow-sm w-fit"
          >
            ← Back to Workload
          </button>
          
          <MasterTaskTracker 
            tasks={taskReport?.detailedTasks || []} 
            users={usersData?.data || []} 
            selectedUser={trackerModalUserId} 
            onSelectUser={setTrackerModalUserId} 
          />
        </div>
      )}

      {/* Task Completion Report */}
      {!trackerModalUserId && tab === 'tasks' && (
        <div className="space-y-6">
          {taskLoading ? (
            <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="card text-center">
                  <p className="text-3xl font-bold text-surface-900">{taskReport?.totalTasks || 0}</p>
                  <p className="text-sm text-surface-500">Total Tasks ({period})</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-emerald-600">{taskReport?.completionPercentage || 0}%</p>
                  <p className="text-sm text-surface-500">Completion Rate</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-primary-600">{taskReport?.completedTasks || 0}</p>
                  <p className="text-sm text-surface-500">Completed Tasks</p>
                </div>
              </div>

              {/* Charts & Status breakdown grid */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Pie chart */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-surface-900 mb-4">Tasks by Status</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                        dataKey="value" nameKey="name" paddingAngle={3}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                      <Legend formatter={(value) => <span className="text-sm text-surface-600">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Status breakdown table */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-surface-900 mb-3">Status Breakdown</h3>
                  <div className="space-y-3">
                    {taskReport?.tasksByStatus?.map((s) => {
                      const cfg = statusConfig(s._id);
                      const pct = taskReport.totalTasks > 0 ? Math.round((s.count / taskReport.totalTasks) * 100) : 0;
                      return (
                        <div key={s._id} className="flex items-center gap-3">
                          <span className={`w-24 text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                          <div className="flex-1 h-2 rounded-full bg-surface-100">
                            <div className={`h-2 rounded-full ${cfg.color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-16 text-right text-sm font-medium text-surface-600">{s.count}</span>
                          <span className="w-12 text-right text-xs text-surface-400">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Performers */}
                {isAdminOrManager && (
                  <div className="card flex flex-col">
                    <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Top Performers
                    </h3>
                    
                    {topPerformers.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-sm text-surface-400 italic">
                        No scored performers yet
                      </div>
                    ) : (
                      <div className="space-y-2 flex-1">
                        {topPerformers.map((user, idx) => (
                          <div 
                            key={user._id} 
                            onClick={() => {
                              setTrackerModalUserId(user._id);
                            }}
                            className="flex items-center gap-3 p-2.5 rounded-lg border border-surface-100 hover:border-amber-200 hover:bg-amber-50/50 cursor-pointer transition-all group"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs shrink-0 relative">
                              {getInitials(user.name)}
                              {idx === 0 && <span className="absolute -top-1 -right-1 text-[10px]">👑</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-surface-900 truncate group-hover:text-amber-800 transition-colors">{user.name}</p>
                              <p className="text-[10px] text-surface-500 truncate">{user.role}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <ScoreBadge score={user.score} />
                              <ChevronRight className="h-4 w-4 text-surface-300 group-hover:text-amber-500 transition-colors" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Detailed Tasks Breakdown Table */}
              <div className="card space-y-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-surface-900">Detailed Task Report</h3>
                    <p className="text-xs text-surface-500">What tasks were assigned, who assigned them, who completed them, and time taken</p>
                  </div>
                  <span className="text-xs text-surface-400">Showing {detailedTasks.length} record(s)</span>
                </div>

                {detailedTasks.length === 0 ? (
                  <p className="py-8 text-center text-sm text-surface-400">No task records for this period filter.</p>
                ) : (
                  <div className="overflow-x-auto border border-surface-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-50 border-b border-surface-200 font-semibold uppercase text-surface-500">
                        <tr>
                          <th className="px-3 py-2.5">Task Title</th>
                          <th className="px-3 py-2.5">Project</th>
                          <th className="px-3 py-2.5">Assigned By</th>
                          <th className="px-3 py-2.5">Assigned To</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5">Assigned On</th>
                          <th className="px-3 py-2.5">Time Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100">
                        {detailedTasks.map((t) => {
                          const cfg = statusConfig(t.status);
                          return (
                            <tr 
                              key={t._id} 
                              onClick={() => setActiveTaskId(t._id)}
                              className="hover:bg-surface-50 transition-colors cursor-pointer group"
                            >
                              <td className="px-3 py-2.5 font-medium text-surface-900 max-w-[200px] truncate group-hover:text-primary-600 transition-colors">{t.title}</td>
                              <td className="px-3 py-2.5 text-surface-600">{t.project?.name || '-'}</td>
                              <td className="px-3 py-2.5 text-purple-700 font-medium">{t.assignedBy || 'Admin'}</td>
                              <td className="px-3 py-2.5 text-primary-700 font-medium">
                                <div className="flex items-center gap-2">
                                  {t.assignedTo || 'Unassigned'}
                                  {t.assignee?._id && <ScoreBadge score={t.assignee?.score || 0} />}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-surface-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                              <td className="px-3 py-2.5 font-medium text-surface-700">
                                {t.status === 'Done'
                                  ? `${t.durationHours != null ? t.durationHours + ' hrs' : 'Completed'}`
                                  : t.estimatedEffort
                                  ? `Est: ${t.estimatedEffort}h`
                                  : 'In Progress'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Workload Report */}
      {!trackerModalUserId && tab === 'workload' && (
        <div className="space-y-6">
          {workloadLoading ? (
            <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>
          ) : workload.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-surface-300 bg-white py-16">
              <Users className="mb-3 h-12 w-12 text-surface-300" />
              <p className="text-lg font-medium text-surface-500">No workload data</p>
              <p className="text-sm text-surface-400">Assign tasks to see workload distribution.</p>
            </div>
          ) : (
            <>
              <div className="card">
                <h3 className="text-sm font-semibold text-surface-900 mb-4">Team Workload Distribution</h3>
                <ResponsiveContainer width="100%" height={Math.max(250, workloadChartData.length * 45)}>
                  <BarChart data={workloadChartData} layout="vertical" margin={{ left: 110, right: 20, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#64748b' }} width={100} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      formatter={(value, name) => [value, name]}
                    />
                    <RechartsLegend
                      verticalAlign="top"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-surface-500">{value}</span>}
                    />
                    {STATUS_ORDER.map((s) => (
                      <Bar
                        key={s}
                        dataKey={s}
                        stackId="a"
                        fill={STACK_COLORS[s]}
                        radius={s === 'Done' ? [4, 4, 0, 0] : 0}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-200 bg-surface-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-500">Assignee</th>
                      {['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'].map((s) => (
                        <th key={s} className="px-4 py-3 text-center text-xs font-semibold uppercase text-surface-500">{s}</th>
                      ))}
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-surface-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {workload.map((w) => (
                      <tr 
                        key={w.assignee?._id || Math.random()} 
                        className={`hover:bg-surface-50 transition-colors ${w.assignee?._id ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (w.assignee?._id) {
                            setTrackerModalUserId(w.assignee._id);
                          }
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-surface-900 group-hover:text-primary-600 transition-colors">
                              {w.assignee?.name || 'Unknown'}
                            </span>
                            {w.assignee?._id && <ScoreBadge score={w.assignee?.score || 0} />}
                          </div>
                        </td>
                        {['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'].map((s) => {
                          const found = w.tasksByStatus?.find((t) => t.status === s);
                          return <td key={s} className="px-4 py-3 text-center text-sm text-surface-600">{found?.count || 0}</td>;
                        })}
                        <td className="px-4 py-3 text-center text-sm font-semibold text-surface-900">{w.totalTasks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Project Progress Report */}
      {!trackerModalUserId && tab === 'projects' && isAdminOrManager && (
        <div className="space-y-6">
          {projectLoading ? (
            <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>
          ) : projectReport.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-surface-300 bg-white py-16">
              <TrendingUp className="mb-3 h-12 w-12 text-surface-300" />
              <p className="text-lg font-medium text-surface-500">No project data</p>
              <p className="text-sm text-surface-400">Create projects to see progress tracking.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projectReport.map((p) => (
                <div key={p._id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-surface-900">{p.name}</h3>
                      <p className="text-xs text-surface-400">{p.taskCount} task(s) · {p.milestoneCount} milestone(s)</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                      p.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                      p.status === 'On Hold' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{p.status}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
                        <span>Tasks</span>
                        <span>{p.completedTasks}/{p.taskCount} — {Math.round(p.taskCompletionPct)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-100">
                        <div className="h-2 rounded-full bg-primary-500" style={{ width: `${p.taskCompletionPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
                        <span>Milestones</span>
                        <span>{p.completedMilestones}/{p.milestoneCount} — {Math.round(p.milestoneCompletionPct)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-100">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${p.milestoneCompletionPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notion Slide-over Drawer Modal for Tasks */}
      {activeTaskId && (
        <TaskDetailModal taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />
      )}
    </div>
  );
}
