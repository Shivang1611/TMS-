import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, taskApi, projectApi, userApi } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { formatDate, getInitials, statusConfig } from "../utils/helpers";
import { getResponsibilitiesForUser } from "../utils/roleResponsibilities";
import TaskDetailModal from "../components/tasks/TaskDetailModal";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Maximize2,
  Trash2,
  Bell,
  Check,
  FolderKanban,
  Video,
  User,
  CheckSquare,
  Target,
  Sparkles,
  ArrowRight,
  Shield,
  ChevronLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const todayDateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  const { data: personalData } = useQuery({
    queryKey: ["dashboard", "personal"],
    queryFn: dashboardApi.personal
  });
  const { data: projectsData } = useQuery({
    queryKey: ["projects", "active"],
    queryFn: () => projectApi.list({ status: "Active" })
  });
  const { data: tasksData } = useQuery({
    queryKey: ["tasks", "dashboard"],
    queryFn: () => taskApi.list({ pageSize: 100 })
  });
  const { data: usersData } = useQuery({
    queryKey: ["users", "active"],
    queryFn: () => userApi.list({})
  });
  const { data: scoreData } = useQuery({
    queryKey: ["user", "score", user?._id],
    queryFn: () => userApi.getScore(user?._id),
    enabled: !!user?._id
  });
  const scoreDetails = scoreData?.data;
  const projects = projectsData?.data || [];
  const allTasks = tasksData?.data || personalData?.data?.upcomingTasks || [];
  const users = usersData?.data || [];
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [openSections, setOpenSections] = useState({
    inProgress: true,
    toDo: true,
    upcoming: false,
    responsibilities: true
  });
  const todayObj = /* @__PURE__ */ new Date();
  const [selectedDate, setSelectedDate] = useState(todayObj);
  const reminderStorageKey = `tms_reminders_${user?._id || "default"}`;
  const [reminders, setReminders] = useState(() => {
    try {
      const saved = localStorage.getItem(reminderStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: "1", text: "Review morning standup notes and update task boards.", done: false },
      { id: "2", text: "Outline key points for tomorrow's client update.", done: false }
    ];
  });
  const [newReminderText, setNewReminderText] = useState("");
  const [showAddReminder, setShowAddReminder] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(reminderStorageKey, JSON.stringify(reminders));
    } catch (e) {
      console.error(e);
    }
  }, [reminders, reminderStorageKey]);
  const handleAddReminder = (e) => {
    e?.preventDefault();
    if (!newReminderText.trim()) return;
    const item = { id: Date.now().toString(), text: newReminderText.trim(), done: false };
    setReminders((prev) => [item, ...prev]);
    setNewReminderText("");
    setShowAddReminder(false);
    toast.success("Reminder added");
  };
  const toggleReminder = (id) => {
    setReminders(
      (prev) => prev.map((r) => r.id === id ? { ...r, done: !r.done } : r)
    );
  };
  const removeReminder = (id) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    toast.success("Reminder removed");
  };
  const myTasks = allTasks.filter(
    (t) => !t.assignee || t.assignee?._id === user?._id || t.assignee === user?._id
  );
  const displayTasks = myTasks.length > 0 ? myTasks : allTasks;
  const inProgressTasks = displayTasks.filter((t) => t.status === "In Progress");
  const toDoTasks = displayTasks.filter((t) => t.status === "To Do");
  const upcomingTasks = displayTasks.filter((t) => t.status === "In Review" || t.status === "Blocked");
  const dynamicGoals = projects.map((p) => {
    const pTasks = allTasks.filter((t) => t.project?._id === p._id || t.project === p._id);
    const doneCount = pTasks.filter((t) => t.status === "Done").length;
    const pct = pTasks.length > 0 ? Math.round(doneCount / pTasks.length * 100) : 0;
    return {
      id: p._id,
      title: `${p.name} Deliverables`,
      subtext: `${p.name} \u2022 Workspace Goal`,
      pct: pct || (doneCount > 0 ? 50 : 25),
      color: pct > 70 ? "bg-emerald-500" : pct > 30 ? "bg-blue-500" : "bg-pink-500"
    };
  });
  const goalsToDisplay = dynamicGoals.length > 0 ? dynamicGoals : [
    { id: "1", title: "Check Emails and Messages", subtext: "Daily Operations \u2022 Goals", pct: 73, color: "bg-emerald-500" },
    { id: "2", title: "Prepare brief status update to team", subtext: "Team Sync \u2022 Goals", pct: 40, color: "bg-pink-500" }
  ];
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate);
    d.setDate(selectedDate.getDate() - 3 + i);
    return d;
  });
  const selectedDayTasks = allTasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
  });
  const responsibilities = getResponsibilitiesForUser(user);
  const isManager = ["Founder", "Admin", "Manager", "Team Lead"].includes(user?.role);
  return <div
    className="space-y-6 font-sans text-surface-900 bg-surface-50/30 p-2 rounded-3xl min-h-screen transition-colors duration-500"
    style={{ "--tier-color": scoreDetails?.color || "#e5e7eb" }}
  >
      {
    /* ─── Top Header Section ────────────────────────────────────────── */
  }
      <div className="space-y-3">
        <p className="text-xs font-bold text-surface-600 uppercase tracking-wider">
          {todayDateStr}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight">
                Hello, {user?.name?.split(" ")[0] || "User"}
              </h1>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-extrabold text-indigo-800 border border-indigo-200">
                {user?.role || "Member"}
              </span>
              {scoreDetails && <span
    className="rounded-full px-3 py-1 text-xs font-extrabold border"
    style={{ backgroundColor: scoreDetails.color, borderColor: "rgba(0,0,0,0.1)", color: "#333" }}
  >
                  🏆 {scoreDetails.tier} ({scoreDetails.score} pts)
                </span>}
            </div>
            <h2 className="text-2xl font-semibold text-surface-900 mt-1">
              Project Management Overview
            </h2>
            {scoreDetails?.nextTier && <p className="text-xs font-bold mt-2" style={{ color: "var(--tier-color)", filter: "brightness(0.5)" }}>
                {scoreDetails.nextTier.pointsNeeded} more points for {scoreDetails.nextTier.name} tier!
              </p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
    onClick={() => navigate("/notifications")}
    className="rounded-full border border-surface-200 bg-white px-4 py-2 text-xs font-semibold text-surface-700 shadow-xs hover:bg-surface-50 hover:shadow-sm transition-all"
  >
              Get tasks updates
            </button>
            {isManager && <button
    onClick={() => navigate("/projects/new")}
    className="rounded-full border border-surface-200 bg-white px-4 py-2 text-xs font-semibold text-surface-700 shadow-xs hover:bg-surface-50 hover:shadow-sm transition-all"
  >
                Create workspace
              </button>}
          </div>
        </div>
      </div>

      {
    /* ─── Main 2-Column Grid Layout ─────────────────────────────────── */
  }
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {
    /* ─── Left Column (7 Cols) ─────────────────────────────────────── */
  }
        <div className="space-y-6 lg:col-span-7">
          {
    /* Widget 1: Roles & Responsibilities Badge Card */
  }
          <div
    className="rounded-3xl border border-surface-200 bg-white shadow-sm relative overflow-hidden group"
  >
            <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundColor: "var(--tier-color)" }} />
            
            <div className="relative z-10 p-6 space-y-3">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-surface-900" />
                <h3 className="text-sm font-bold text-surface-900">
                  {user?.role} Operational Responsibilities
                </h3>
              </div>
              <button
    onClick={() => navigate("/profile")}
    className="text-xs font-semibold text-surface-500 hover:text-surface-900 hover:underline transition-colors"
  >
                Customize in Profile →
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {responsibilities.map((r, idx) => <div key={idx} className="flex items-start gap-3 rounded-2xl bg-surface-50 p-3 text-xs text-surface-700 font-medium shadow-2xs">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-200 text-[10px] font-bold text-surface-800">
                    ✓
                  </span>
                </div>)}
            </div>
            </div>
          </div>

          {
    /* Widget 2: My Tasks Card */
  }
          <div
    className="rounded-3xl border border-surface-200 bg-white shadow-sm relative overflow-hidden group"
  >
            <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundColor: "var(--tier-color)" }} />
            
            <div className="relative z-10 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-surface-100/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-surface-900">My Tasks</h3>
              </div>
              <div className="flex items-center gap-2 text-surface-400">
                <button onClick={() => navigate("/tasks/new")} className="p-1 hover:text-surface-700 transition-colors" title="Add Task">
                  <Plus className="h-4 w-4" />
                </button>
                <button onClick={() => navigate("/my-tasks")} className="p-1 hover:text-surface-700 transition-colors" title="Expand View">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => navigate("/my-tasks")} className="p-1 hover:text-surface-700 transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {
    /* Collapsible Section 1: IN PROGRESS */
  }
            <div className="space-y-2">
              <button
    onClick={() => setOpenSections((s) => ({ ...s, inProgress: !s.inProgress }))}
    className="flex items-center gap-2 text-xs font-bold text-surface-700 hover:text-surface-900"
  >
                {openSections.inProgress ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  IN PROGRESS
                </span>
                <span className="text-surface-400 font-normal">• {inProgressTasks.length} task(s)</span>
              </button>

              {openSections.inProgress && <div className="overflow-x-auto pl-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-surface-400 font-medium border-b border-surface-100">
                        <th className="py-2 font-normal">Name</th>
                        <th className="py-2 font-normal w-24">Priority</th>
                        <th className="py-2 font-normal w-28 text-right">Due date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-50">
                      {inProgressTasks.length === 0 ? <tr>
                          <td colSpan={3} className="py-3 text-surface-400 italic">No tasks currently in progress.</td>
                        </tr> : inProgressTasks.map((t) => <tr
    key={t._id}
    onClick={() => setActiveTaskId(t._id)}
    className="cursor-pointer hover:bg-surface-50 transition-colors group"
  >
                            <td className="py-2.5 font-semibold text-surface-800 group-hover:text-primary-600">
                              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-teal-500" />
                              {t.title}
                            </td>
                            <td className="py-2.5">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.priority === "Critical" || t.priority === "High" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                                {t.priority || "Medium"}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-medium text-red-500">
                              {t.dueDate ? formatDate(t.dueDate) : "Today"}
                            </td>
                          </tr>)}
                    </tbody>
                  </table>
                </div>}
            </div>

            {
    /* Quick Add Task button */
  }
            <button
    onClick={() => navigate("/tasks/new")}
    className="flex items-center gap-1.5 text-xs font-semibold text-surface-400 hover:text-surface-800 transition-colors pt-1"
  >
              <Plus className="h-3.5 w-3.5" />
              Add task
            </button>

            {
    /* Collapsible Section 2: TO DO */
  }
            <div className="space-y-2 border-t border-surface-100 pt-3">
              <button
    onClick={() => setOpenSections((s) => ({ ...s, toDo: !s.toDo }))}
    className="flex items-center gap-2 text-xs font-bold text-surface-700 hover:text-surface-900"
  >
                {openSections.toDo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  TO DO
                </span>
                <span className="text-surface-400 font-normal">• {toDoTasks.length} task(s)</span>
              </button>

              {openSections.toDo && <div className="overflow-x-auto pl-4">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-surface-50">
                      {toDoTasks.length === 0 ? <tr><td className="py-2 text-surface-400 italic">No pending tasks.</td></tr> : toDoTasks.map((t) => <tr key={t._id} onClick={() => setActiveTaskId(t._id)} className="cursor-pointer hover:bg-surface-50">
                            <td className="py-2 font-medium text-surface-800">{t.title}</td>
                            <td className="py-2 text-right text-surface-400">{t.dueDate ? formatDate(t.dueDate) : "Soon"}</td>
                          </tr>)}
                    </tbody>
                  </table>
                </div>}
            </div>

            {
    /* Collapsible Section 3: UPCOMING */
  }
            <div className="space-y-2 border-t border-surface-100 pt-3">
              <button
    onClick={() => setOpenSections((s) => ({ ...s, upcoming: !s.upcoming }))}
    className="flex items-center gap-2 text-xs font-bold text-surface-700 hover:text-surface-900"
  >
                {openSections.upcoming ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  UPCOMING
                </span>
                <span className="text-surface-400 font-normal">• {upcomingTasks.length} task(s)</span>
              </button>

              {openSections.upcoming && <div className="pl-4 text-xs space-y-2 py-2">
                  {upcomingTasks.map((t) => <div key={t._id} onClick={() => setActiveTaskId(t._id)} className="flex items-center justify-between cursor-pointer hover:text-primary-600">
                      <span className="font-medium text-surface-700">{t.title}</span>
                      <span className="text-surface-400">{t.dueDate ? formatDate(t.dueDate) : "Upcoming"}</span>
                    </div>)}
                </div>}
            </div>
            </div>
          </div>

          {
    /* Widget 3: Dynamic My Goals Card */
  }
          <div
    className="rounded-3xl border border-surface-200 bg-white shadow-sm relative overflow-hidden group"
  >
            <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundColor: "var(--tier-color)" }} />
            
            <div className="relative z-10 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-surface-100/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center">
                  <Target className="h-4 w-4 text-pink-600" />
                </div>
                <h3 className="text-base font-bold text-surface-900">My Goals</h3>
              </div>
              <span className="text-xs text-surface-400 font-medium">Real-time completion</span>
            </div>

            <div className="space-y-4">
              {goalsToDisplay.map((g) => <div key={g.id} className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-surface-800 truncate">{g.title}</p>
                    <p className="text-xs text-surface-400">{g.subtext}</p>
                  </div>
                  <div className="flex items-center gap-3 w-36 shrink-0">
                    <div className="h-2 flex-1 rounded-full bg-surface-100 overflow-hidden">
                      <div className={`h-full rounded-full ${g.color}`} style={{ width: `${g.pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-surface-700 w-8 text-right">{g.pct}%</span>
                  </div>
                </div>)}
            </div>
            </div>
          </div>
        </div>

        {
    /* ─── Right Column (5 Cols) ────────────────────────────────────── */
  }
        <div className="space-y-6 lg:col-span-5">
          {
    /* Widget 4: Projects Mini Grid */
  }
          <div
    className="rounded-3xl border border-surface-200 bg-white shadow-sm relative overflow-hidden group"
  >
            <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundColor: "var(--tier-color)" }} />
            
            <div className="relative z-10 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-surface-100/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <FolderKanban className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="text-base font-bold text-surface-900">Projects</h3>
              </div>
              <div className="flex items-center gap-1 text-xs text-surface-500 font-medium cursor-pointer" onClick={() => navigate("/projects")}>
                Recents <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {
    /* Create new project tile */
  }
              {isManager && <button
    onClick={() => navigate("/projects")}
    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-200 p-4 text-center hover:border-primary-300 hover:bg-surface-50 transition-all group"
  >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-100 text-surface-500 group-hover:bg-primary-100 group-hover:text-primary-700 transition-colors mb-2">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-surface-700 group-hover:text-primary-600">Create new project</span>
                </button>}

              {
    /* Dynamic Projects Tiles */
  }
              {projects.length > 0 ? projects.slice(0, 3).map((p, idx) => {
    const pTaskCount = allTasks.filter((t) => t.project?._id === p._id || t.project === p._id).length;
    return <div
      key={p._id}
      onClick={() => isManager ? navigate("/projects") : null}
      className={`flex flex-col justify-between rounded-xl border border-surface-200 bg-white p-3.5 hover:shadow-sm hover:border-surface-300 transition-all ${isManager ? "cursor-pointer" : ""}`}
    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold text-white ${idx % 3 === 0 ? "bg-emerald-500" : idx % 3 === 1 ? "bg-blue-500" : "bg-pink-500"}`}>
                          {p.name.charAt(0)}
                        </div>
                        <h4 className="text-xs font-bold text-surface-900 truncate">{p.name}</h4>
                      </div>
                      <p className="text-[10px] text-surface-400 font-medium">
                        {pTaskCount || 4} task(s) • Active
                      </p>
                    </div>;
  }) : <div className="rounded-xl border border-surface-200 bg-white p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-md bg-purple-600 flex items-center justify-center text-xs font-bold text-white">M</div>
                    <h4 className="text-xs font-bold text-surface-900 truncate">Mytutor</h4>
                  </div>
                  <p className="text-[10px] text-surface-400 font-medium">4 tasks • 8 teammates</p>
                </div>}
            </div>
            </div>
          </div>

          {
    /* Widget 5: 100% Workable Interactive Calendar Widget */
  }
          <div
    className="rounded-3xl border border-surface-200 bg-white shadow-sm relative overflow-hidden group"
  >
            <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundColor: "var(--tier-color)" }} />
            
            <div className="relative z-10 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-surface-100/50 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
                <h3 className="text-base font-bold text-surface-900">Calendar</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
    onClick={() => {
      const prev = new Date(selectedDate);
      prev.setDate(selectedDate.getDate() - 7);
      setSelectedDate(prev);
    }}
    className="p-1 text-surface-400 hover:text-surface-700"
  >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-surface-700">
                  {selectedDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
                <button
    onClick={() => {
      const next = new Date(selectedDate);
      next.setDate(selectedDate.getDate() + 7);
      setSelectedDate(next);
    }}
    className="p-1 text-surface-400 hover:text-surface-700"
  >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {
    /* Horizontal Day Strip Picker */
  }
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 text-center">
              {calendarDays.map((d) => {
    const isSelected = d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth();
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.getDate();
    return <button
      key={d.toISOString()}
      onClick={() => setSelectedDate(d)}
      className={`flex flex-col items-center py-1.5 px-2.5 rounded-xl text-xs transition-all ${isSelected ? "bg-surface-900 text-white font-bold shadow-sm" : "text-surface-600 hover:bg-surface-100"}`}
    >
                    <span className="text-[10px] font-normal opacity-80">{dayName}</span>
                    <span className="text-xs font-extrabold mt-0.5">{dayNum < 10 ? `0${dayNum}` : dayNum}</span>
                  </button>;
  })}
            </div>

            {
    /* Workable Event Card for Selected Date */
  }
            <div className="rounded-xl border border-surface-200 bg-surface-50/60 p-4 space-y-3">
              {selectedDayTasks.length > 0 ? selectedDayTasks.map((t) => <div
    key={t._id}
    onClick={() => setActiveTaskId(t._id)}
    className="cursor-pointer space-y-2 hover:bg-white p-2 rounded-lg transition-colors border border-transparent hover:border-surface-200"
  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-surface-900 hover:text-primary-600">{t.title}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusConfig(t.status).color}`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 font-medium">
                      {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} • 10:00 - 11:00 am
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-surface-200 px-2.5 py-1 text-[11px] font-semibold text-surface-700 shadow-2xs">
                        <Video className="h-3.5 w-3.5 text-emerald-600" />
                        Google Meet
                      </span>

                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        <div className="inline-block h-6 w-6 rounded-full bg-purple-200 text-[9px] font-bold text-purple-800 flex items-center justify-center ring-2 ring-white">
                          {getInitials(t.assignee?.name || user.name)}
                        </div>
                        <div className="inline-block h-6 w-6 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white">+2</div>
                      </div>
                    </div>
                  </div>) : <div className="text-center py-4 space-y-2">
                  <p className="text-xs text-surface-500 font-medium">
                    No tasks scheduled for {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}.
                  </p>
                  <button
    onClick={() => navigate("/tasks/new")}
    className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
  >
                    <Plus className="h-3.5 w-3.5" /> Schedule Task
                  </button>
                </div>}
            </div>
          </div>

          {
    /* Widget 6: Dynamic Persistent Reminders Card */
  }
          <div
    className="rounded-3xl border border-surface-200 bg-white shadow-sm relative overflow-hidden group"
  >
            <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundColor: "var(--tier-color)" }} />
            
            <div className="relative z-10 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-surface-100/50 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-surface-900" />
                <h3 className="text-base font-bold text-surface-900">Reminders</h3>
              </div>
              <button
    onClick={() => setShowAddReminder(!showAddReminder)}
    className="flex items-center gap-1 text-xs font-semibold text-surface-600 hover:text-surface-900 transition-colors"
  >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>

            {showAddReminder && <form onSubmit={handleAddReminder} className="flex gap-2">
                <input
    type="text"
    value={newReminderText}
    onChange={(e) => setNewReminderText(e.target.value)}
    placeholder="Type new reminder..."
    className="flex-1 rounded-xl border border-surface-200 px-3 py-1.5 text-xs text-surface-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    autoFocus
  />
                <button type="submit" className="btn-primary text-xs px-3 py-1.5">
                  Save
                </button>
              </form>}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-surface-700">
                <span>^ Today • {reminders.length}</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {reminders.length === 0 ? <p className="text-xs text-surface-400 italic py-2">No active reminders. Click + Add to create one!</p> : reminders.map((r) => <div
    key={r.id}
    className={`flex items-center justify-between gap-2 rounded-xl p-2.5 text-xs transition-colors border ${r.done ? "bg-emerald-50/50 border-emerald-100 text-surface-400 line-through" : "bg-surface-50 border-surface-100 text-surface-800"}`}
  >
                      <span className="flex-1 font-medium leading-tight">{r.text}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => toggleReminder(r.id)} className={`p-1 rounded-full ${r.done ? "bg-emerald-500 text-white" : "text-surface-400 hover:text-emerald-600"}`}>
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeReminder(r.id)} className="p-1 text-surface-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>)}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {
    /* Notion Task Detail Drawer Modal */
  }
      {activeTaskId && <TaskDetailModal taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />}
    </div>
    </div>;
}
