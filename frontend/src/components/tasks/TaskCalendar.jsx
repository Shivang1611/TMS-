import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function TaskCalendar({ tasks, onTaskClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInThisMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInThisMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Next month padding to fill 6 weeks (42 days)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (!task.dueDate) return;
      const dateString = new Date(task.dueDate).toDateString();
      if (!map[dateString]) map[dateString] = [];
      map[dateString].push(task);
    });
    return map;
  }, [tasks]);

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    const now = new Date();
    return date.getDate() === now.getDate() && 
           date.getMonth() === now.getMonth() && 
           date.getFullYear() === now.getFullYear();
  };

  return (
    <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="flex items-center justify-between p-4 border-b border-surface-200">
        <h2 className="text-lg font-bold text-surface-900">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={today} className="btn-secondary py-1.5 px-4 text-xs font-semibold">
            Today
          </button>
          <div className="flex items-center gap-1 border border-surface-200 rounded-lg p-0.5">
            <button onClick={prevMonth} className="p-1.5 hover:bg-surface-100 rounded-md text-surface-600 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-surface-100 rounded-md text-surface-600 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-7 border-b border-surface-200 bg-surface-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-3 text-center text-xs font-bold text-surface-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      
      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {daysInMonth.map((dayObj, i) => {
          const dateString = dayObj.date.toDateString();
          const dayTasks = tasksByDate[dateString] || [];
          
          return (
            <div 
              key={i} 
              className={`border-r border-b border-surface-100 p-2 overflow-y-auto ${
                !dayObj.isCurrentMonth ? 'bg-surface-50/50' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold h-6 w-6 flex items-center justify-center rounded-full ${
                  isToday(dayObj.date) 
                    ? 'bg-primary-600 text-white' 
                    : !dayObj.isCurrentMonth 
                      ? 'text-surface-400' 
                      : 'text-surface-700'
                }`}>
                  {dayObj.date.getDate()}
                </span>
              </div>
              
              <div className="space-y-1.5">
                {dayTasks.map(task => (
                  <div 
                    key={task._id}
                    onClick={() => onTaskClick(task._id)}
                    className={`cursor-pointer px-2 py-1.5 rounded-md text-xs font-medium truncate border transition-colors ${
                      task.status === 'Done' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        : task.status === 'Blocked'
                          ? 'bg-red-50 border-red-100 text-red-700 hover:bg-red-100'
                          : task.status === 'In Progress'
                            ? 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100'
                            : 'bg-white border-surface-200 text-surface-700 hover:bg-surface-50'
                    }`}
                    title={task.title}
                  >
                    <div className="flex items-center gap-1.5">
                      {task.status === 'Done' && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{task.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
