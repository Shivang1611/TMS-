export const DEFAULT_ROLE_RESPONSIBILITIES = {
  Founder: [
    'Oversee organizational strategy, multi-workspace projects, and department budgets.',
    'Review weekly & monthly performance reports and overall task throughput.',
    'Manage executive user permissions, system governance, and security audit logs.',
    'Unblock critical organization-wide bottlenecks and sign off on high-impact milestones.',
  ],
  Admin: [
    'Manage organizational structure, department creation, and team lead assignments.',
    'Audit team workload distribution and resolve resource allocation bottlenecks.',
    'Enforce security compliance, invite team members, and manage access roles.',
    'Track project sprint goals, master task schedules, and department deliverables.',
  ],
  Manager: [
    'Define team sprint objectives, manage project timelines, and set task priorities.',
    'Assign daily tasks to team leads and members; monitor team throughput.',
    'Conduct daily progress reviews and unblock technical or operational issues.',
    'Evaluate member workload capacity and ensure timely task completion.',
  ],
  'Team Lead': [
    'Distribute daily tasks to team members and ensure alignment with project goals.',
    'Review daily work logs, verify task deliverables, and update task statuses.',
    'Lead daily standups and report team progress and blocked items to Managers/Admins.',
    'Provide technical guidance, maintain quality standards, and assist team members.',
  ],
  Member: [
    'Execute assigned daily tasks efficiently and meet specified deadlines.',
    'Keep task statuses updated (To Do, In Progress, Blocked, Done) in real-time.',
    'Document clear daily work updates, comments, and task remarks.',
    'Escalate blocked tasks promptly with detailed reasons for team lead review.',
  ],
};

export function getResponsibilitiesForUser(user) {
  if (!user) return [];
  const custom = user.profile?.responsibilities;
  if (custom && Array.isArray(custom) && custom.length > 0) {
    return custom;
  }
  return DEFAULT_ROLE_RESPONSIBILITIES[user.role] || DEFAULT_ROLE_RESPONSIBILITIES.Member;
}
