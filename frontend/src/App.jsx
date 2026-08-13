import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Lazy-loaded page components — split into separate chunks
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MyTasks = lazy(() => import('./pages/MyTasks'));
const Tasks = lazy(() => import('./pages/Tasks'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));
const TaskCreate = lazy(() => import('./pages/TaskCreate'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectCreate = lazy(() => import('./pages/ProjectCreate'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Users = lazy(() => import('./pages/Users'));
const Reports = lazy(() => import('./pages/Reports'));
const TeamsDepartments = lazy(() => import('./pages/TeamsDepartments'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Notes = lazy(() => import('./pages/Notes'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return children;
}

function ManagerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }
  
  const isManager = ['Founder', 'Admin', 'Manager', 'Team Lead'].includes(user?.role);
  if (!isManager) {
    return <Navigate to="/my-tasks" replace />;
  }
  return children;
}

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/tasks" element={<ManagerRoute><Tasks /></ManagerRoute>} />
        <Route path="/tasks/new" element={<TaskCreate />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<ManagerRoute><ProjectCreate /></ManagerRoute>} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/users" element={<Users />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/org-structure" element={<ManagerRoute><TeamsDepartments /></ManagerRoute>} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/notes" element={<Notes />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
