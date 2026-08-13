import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noteApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import NoteEditor from '../components/notes/NoteEditor';
import { Search, Plus, FileText, Clock, Pin, Trash2, Link as LinkIcon, Unlink } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function Notes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('My Notes');
  const [search, setSearch] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  // Queries
  const { data: myNotesData, isLoading: loadingMyNotes } = useQuery({
    queryKey: ['notes', 'my', search],
    queryFn: () => noteApi.list(search ? { search } : {}),
  });

  const { data: sharedNotesData, isLoading: loadingSharedNotes } = useQuery({
    queryKey: ['notes', 'shared'],
    queryFn: () => noteApi.sharedWithMe(),
  });

  const myNotes = myNotesData?.data || [];
  const sharedNotes = sharedNotesData?.data || [];

  const notes = activeTab === 'My Notes' ? myNotes : sharedNotes;
  const isLoading = activeTab === 'My Notes' ? loadingMyNotes : loadingSharedNotes;
  const selectedNote = notes.find(n => n._id === selectedNoteId) || null;

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => noteApi.create({ title: 'Untitled Note', content: {}, contentText: '' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'my'] });
      setSelectedNoteId(res.data._id);
      setActiveTab('My Notes');
    },
    onError: () => toast.error('Failed to create note'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => noteApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => noteApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'my'] });
      setSelectedNoteId(null);
      toast.success('Note deleted');
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({ id, taskId }) => noteApi.link(id, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note link updated');
    },
  });

  const handleCreate = () => {
    createMutation.mutate();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      {/* Sidebar List */}
      <div className="w-80 flex flex-col bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-surface-200 space-y-4 bg-surface-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-surface-900">Notes</h2>
            <button 
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="btn-primary p-1.5"
              title="New Note"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2 p-1 bg-surface-200 rounded-lg">
            {['My Notes', 'Shared with Me'].map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedNoteId(null); }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-600 hover:text-surface-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'My Notes' && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 h-9 text-sm w-full"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-surface-500">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="p-4 flex flex-col items-center text-center">
              <FileText className="h-8 w-8 text-surface-300 mb-2" />
              <p className="text-sm text-surface-500">No notes found.</p>
            </div>
          ) : (
            notes.map(note => (
              <div 
                key={note._id}
                onClick={() => setSelectedNoteId(note._id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                  selectedNoteId === note._id 
                    ? 'bg-primary-50 border-primary-200' 
                    : 'bg-white border-transparent hover:bg-surface-50 hover:border-surface-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-surface-900 truncate">
                    {note.title || 'Untitled'}
                  </h4>
                  {note.pinned && <Pin className="h-3.5 w-3.5 text-primary-600 shrink-0" />}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-surface-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(note.updatedAt)}</span>
                </div>
                {note.linkedTaskId && (
                  <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                    <LinkIcon className="h-3 w-3" /> Linked to Task
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedNote ? (
          <div className="flex flex-col h-full bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-surface-200 flex items-center justify-between bg-surface-50">
              <NoteTitleInput
                key={selectedNote._id}
                noteId={selectedNote._id}
                initialTitle={selectedNote.title}
                readOnly={activeTab !== 'My Notes'}
                onSave={(newTitle) => {
                  updateMutation.mutate({ id: selectedNote._id, data: { title: newTitle } });
                }}
              />
              
              {activeTab === 'My Notes' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const taskId = window.prompt('Enter Task ID to link (or clear to unlink):', selectedNote.linkedTaskId || '');
                      if (taskId !== null) {
                        linkMutation.mutate({ id: selectedNote._id, taskId: taskId || null });
                      }
                    }}
                    className={`btn-secondary text-xs px-2 py-1 flex items-center gap-1.5 ${selectedNote.linkedTaskId ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}
                    title={selectedNote.linkedTaskId ? "Linked to task. Click to edit/unlink." : "Link to a task"}
                  >
                    {selectedNote.linkedTaskId ? <Unlink className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
                    {selectedNote.linkedTaskId ? 'Linked' : 'Link Task'}
                  </button>
                  <button
                    onClick={() => updateMutation.mutate({ id: selectedNote._id, data: { pinned: !selectedNote.pinned } })}
                    className={`p-1.5 rounded-lg transition-colors ${selectedNote.pinned ? 'text-primary-600 bg-primary-100' : 'text-surface-400 hover:bg-surface-200'}`}
                    title={selectedNote.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(selectedNote._id)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden bg-white">
              {/* NoteEditor handles its own scroll and height */}
              <NoteEditor 
                key={selectedNote._id} // force re-render when changing notes
                initialContent={selectedNote.content} 
                readOnly={activeTab !== 'My Notes'}
                onSave={async (data) => {
                  if (activeTab === 'My Notes') {
                    await updateMutation.mutateAsync({ id: selectedNote._id, data });
                  }
                }} 
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-xl border border-surface-200 flex flex-col items-center justify-center text-surface-500">
            <FileText className="h-12 w-12 text-surface-300 mb-4" />
            <p className="text-lg font-medium">Select a note to view</p>
            {activeTab === 'My Notes' && (
              <button onClick={handleCreate} className="mt-4 text-sm text-primary-600 hover:underline">
                Or create a new one
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteTitleInput({ noteId, initialTitle, readOnly, onSave }) {
  const [title, setTitle] = useState(initialTitle || '');
  const timeoutRef = useRef(null);

  useEffect(() => {
    setTitle(initialTitle || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  const handleChange = (e) => {
    setTitle(e.target.value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onSave(e.target.value);
    }, 1000);
  };

  return (
    <input
      type="text"
      value={title}
      readOnly={readOnly}
      onChange={handleChange}
      className="text-xl font-bold text-surface-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-1/2"
      placeholder="Note Title"
    />
  );
}
