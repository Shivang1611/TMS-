import { Trophy } from 'lucide-react';

export default function ScoreBadge({ score = 0, className = '' }) {
  // Determine tier based on the same config as backend scoreService
  let tier = { name: "Beginner", bg: "bg-surface-100", text: "text-surface-700", border: "border-surface-200" };
  
  if (score >= 500) {
    tier = { name: "Elite", bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" };
  } else if (score >= 301) {
    tier = { name: "Excellent", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" };
  } else if (score >= 151) {
    tier = { name: "Great", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" };
  } else if (score >= 51) {
    tier = { name: "Good", bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" };
  }

  return (
    <div title={`Rank: ${tier.name} (${score} pts)`} className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold shadow-sm ${tier.bg} ${tier.text} ${tier.border} ${className}`}>
      <Trophy className="h-2.5 w-2.5" />
      {score}
    </div>
  );
}
