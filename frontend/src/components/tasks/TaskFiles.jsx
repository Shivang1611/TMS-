import { useMemo } from 'react';
import { Link, ExternalLink, FileText } from 'lucide-react';
import { formatDate } from '../../utils/helpers';

export default function TaskFiles({ tasks, onTaskClick }) {
  const extractedLinks = useMemo(() => {
    const links = [];
    const urlRegex = /(https?:\/\/[^\s<]+)/g;

    tasks.forEach(task => {
      if (!task.description) return;
      
      const matches = task.description.match(urlRegex);
      if (matches) {
        // Deduplicate within the same task description if needed, or just push all
        const uniqueMatches = [...new Set(matches)];
        
        uniqueMatches.forEach(url => {
          // Clean up trailing punctuation if the regex caught it
          let cleanUrl = url.replace(/['"]$/, '').replace(/[.,)>\]]$/, '');
          
          links.push({
            url: cleanUrl,
            taskId: task._id,
            taskTitle: task.title,
            projectName: task.project?.name,
            addedAt: task.createdAt
          });
        });
      }
    });

    // Sort by most recent
    return links.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  }, [tasks]);

  return (
    <div className="rounded-2xl border border-surface-200 bg-white shadow-sm overflow-hidden">
      <div className="p-6 border-b border-surface-200">
        <h2 className="text-lg font-bold text-surface-900 mb-1">Related Resources & Links</h2>
        <p className="text-sm text-surface-500">
          Automatically extracted links and resources from your task descriptions.
        </p>
      </div>

      {extractedLinks.length === 0 ? (
        <div className="p-12 text-center">
          <Link className="h-12 w-12 text-surface-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-surface-900 mb-2">No resources found</h3>
          <p className="text-surface-500 max-w-md mx-auto">
            Try adding some links (Google Docs, Figma, etc.) into your task descriptions. They will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-surface-50 font-semibold text-surface-500 border-b border-surface-200">
              <tr>
                <th className="px-6 py-4">Resource Link</th>
                <th className="px-6 py-4">Associated Task</th>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4 w-40">Extracted On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 bg-white">
              {extractedLinks.map((link, i) => (
                <tr key={`${link.taskId}-${i}`} className="hover:bg-surface-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-surface-900">
                    <a 
                      href={link.url.startsWith('http') ? link.url : `https://del1.vultrobjects.com/caderainfotech-tms/${link.url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary-600 hover:text-primary-800 transition-colors max-w-sm truncate"
                      title={link.url}
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      <span className="truncate">{link.url}</span>
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => onTaskClick(link.taskId)}
                      className="flex items-center gap-2 text-surface-700 hover:text-primary-600 transition-colors text-left"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-surface-400" />
                      <span className="truncate max-w-[200px]">{link.taskTitle}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-surface-600 truncate max-w-[150px]">
                    {link.projectName || '—'}
                  </td>
                  <td className="px-6 py-4 text-surface-500 whitespace-nowrap">
                    {formatDate(link.addedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
