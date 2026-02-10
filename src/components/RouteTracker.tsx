import React, { useState, useEffect } from 'react';
import { Route } from '../types';
import { Check, X, Circle, Save, Edit2, Plus, GripVertical, Trash2, Filter } from 'lucide-react';
import { getAllPokemonNames } from '../utils/pokeApi';
import AutocompleteInput from './AutocompleteInput';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  routes: Route[];
  onUpdateRoute: (routeId: string, updates: Partial<Route>) => void;
  onCatch: (routeId: string, p1Species: string, p2Species: string, p3Species: string) => void;
  onAddRoute: (name: string) => void;
  onDeleteRoute: (id: string) => void;
  onReorderRoutes: (routes: Route[]) => void;
}

// Sortable Row Component
const SortableRow = ({ route, isEditing, children }: { route: Route, isEditing: boolean, children: React.ReactNode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: route.id, data: { type: 'route', route } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isEditing ? 100 : (isDragging ? 10 : 1),
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition group bg-zinc-900/40">
       <td className="py-3 px-2 w-8 text-zinc-600">
         <div {...attributes} {...listeners} className="cursor-grab hover:text-zinc-400">
           <GripVertical size={16} />
         </div>
       </td>
       {children}
    </tr>
  );
};

const RouteTracker: React.FC<Props> = ({ routes, onUpdateRoute, onCatch, onAddRoute, onDeleteRoute, onReorderRoutes }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [p1Input, setP1Input] = useState('');
  const [p2Input, setP2Input] = useState('');
  const [p3Input, setP3Input] = useState('');
  const [statusInput, setStatusInput] = useState<Route['status']>('empty');
  const [failedByInput, setFailedByInput] = useState<string[]>([]);
  const [pokemonList, setPokemonList] = useState<string[]>([]);
  
  // New State
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard');
  const [filterCompleted, setFilterCompleted] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    getAllPokemonNames().then(names => {
        const capitalized = names.map(n => n.charAt(0).toUpperCase() + n.slice(1));
        setPokemonList(capitalized);
    });
  }, []);

  const handleStartEdit = (route: Route) => {
    setEditingId(route.id);
    setP1Input(route.encounterP1 || '');
    setP2Input(route.encounterP2 || '');
    setP3Input(route.encounterP3 || '');
    setStatusInput(route.status);
    setFailedByInput(route.failedBy || []);
  };

  const handleSave = (routeId: string) => {
    if (statusInput === 'caught') {
        onCatch(routeId, p1Input, p2Input, p3Input);
    }
    
    // Typecast strictness for failedBy array
    const cleanFailedBy = failedByInput as ('player1' | 'player2' | 'player3')[];

    onUpdateRoute(routeId, { 
      encounterP1: p1Input, 
      encounterP2: p2Input, 
      encounterP3: p3Input,
      status: statusInput,
      failedBy: cleanFailedBy.length > 0 ? cleanFailedBy : undefined
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleAdd = () => {
      if(newRouteName.trim()) {
          onAddRoute(newRouteName.trim());
          setNewRouteName('');
      }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
       const oldIndex = routes.findIndex(r => r.id === active.id);
       const newIndex = routes.findIndex(r => r.id === over?.id);
       onReorderRoutes(arrayMove(routes, oldIndex, newIndex));
    }
  };

  // Filter and Sort Logic
  const getCurrentRoutes = () => {
      // 1. Tab Filter
      let filtered = routes.filter(r => 
          activeTab === 'standard' ? !r.isCustom : r.isCustom
      );

      // 2. Completed Filter (Move to bottom)
      if (filterCompleted) {
          return [...filtered].sort((a, b) => {
              const isACone = ['caught', 'failed', 'skipped'].includes(a.status);
              const isBDone = ['caught', 'failed', 'skipped'].includes(b.status);
              if (isACone === isBDone) return 0;
              return isACone ? 1 : -1;
          });
      }
      
      return filtered;
  };

  const displayRoutes = getCurrentRoutes();

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 mt-8 overflow-hidden">
      {/* Header & Tabs */}
      <div className="border-b border-zinc-800 bg-zinc-950/20">
          <div className="flex items-center justify-between px-6 py-3">
             <div className="flex gap-4">
                 <button 
                    onClick={() => setActiveTab('standard')}
                    className={`text-sm font-semibold pb-1 border-b-2 transition ${activeTab === 'standard' ? 'text-zinc-100 border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                 >
                     Standard Routes
                 </button>
                 <button 
                    onClick={() => setActiveTab('custom')}
                    className={`text-sm font-semibold pb-1 border-b-2 transition ${activeTab === 'custom' ? 'text-zinc-100 border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                 >
                     Own Encounters
                 </button>
             </div>
             
             <button 
                onClick={() => setFilterCompleted(!filterCompleted)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${filterCompleted ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'}`}
             >
                <Filter size={14} />
                {filterCompleted ? 'Completed at Bottom' : 'Filter Status'}
             </button>
          </div>
      </div>
      
      {/* Custom Route Input */}
      {activeTab === 'custom' && (
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex gap-2">
              <input 
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  placeholder="Enter custom location name..."
                  className="bg-zinc-950 border border-zinc-700 rounded-md px-4 py-2 text-sm text-zinc-200 focus:border-indigo-500 outline-none w-full max-w-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <button 
                  onClick={handleAdd}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition"
              >
                  <Plus size={16} /> Add
              </button>
          </div>
      )}

      <div className="overflow-x-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider bg-zinc-950/40">
              <th className="py-3 px-2 w-8"></th>
              <th className="py-3 px-4 font-semibold">Location</th>
              <th className="py-3 px-4 font-semibold text-blue-400">Player 1 Encounter</th>
              <th className="py-3 px-4 font-semibold text-red-400">Player 2 Encounter</th>
              <th className="py-3 px-4 font-semibold text-emerald-400">Player 3 Encounter</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Failed By</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          
           <SortableContext items={displayRoutes.map(r => r.id)} strategy={verticalListSortingStrategy} disabled={filterCompleted}>
            <tbody>
                {displayRoutes.map(route => {
                const isEditing = editingId === route.id;
                
                return (
                    <SortableRow key={route.id} route={route} isEditing={isEditing}>
                    <td className="py-3 px-4 font-medium text-sm text-zinc-300">
                        {route.name}
                        {route.isCustom && <span className="ml-2 text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">Custom</span>}
                    </td>
                    
                    {/* P1 Input */}
                    <td className="py-3 px-4 relative">
                        {isEditing ? (
                        <AutocompleteInput 
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm w-full text-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            value={p1Input}
                            onChange={setP1Input}
                            options={pokemonList}
                            placeholder="Pokemon Name"
                        />
                        ) : (
                        <span className="text-blue-200 text-sm font-medium">{route.encounterP1 || '-'}</span>
                        )}
                    </td>

                    {/* P2 Input */}
                    <td className="py-3 px-4 relative">
                        {isEditing ? (
                        <AutocompleteInput 
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm w-full text-red-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                            value={p2Input}
                            onChange={setP2Input}
                            options={pokemonList}
                            placeholder="Pokemon Name"
                        />
                        ) : (
                        <span className="text-red-200 text-sm font-medium">{route.encounterP2 || '-'}</span>
                        )}
                    </td>

                    {/* P3 Input */}
                    <td className="py-3 px-4 relative">
                        {isEditing ? (
                        <AutocompleteInput 
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm w-full text-emerald-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                            value={p3Input}
                            onChange={setP3Input}
                            options={pokemonList}
                            placeholder="Pokemon Name"
                        />
                        ) : (
                        <span className="text-emerald-200 text-sm font-medium">{route.encounterP3 || '-'}</span>
                        )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                        {isEditing ? (
                        <div className="flex flex-col gap-2">
                        <select 
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-zinc-300 w-full"
                            value={statusInput}
                            onChange={(e) => setStatusInput(e.target.value as any)}
                        >
                            <option value="empty">Open</option>
                            <option value="caught">Caught</option>
                            <option value="failed">Failed</option>
                            <option value="skipped">Skipped</option>
                        </select>
                        </div>
                        ) : (
                        <div className="flex items-center">
                            {route.status === 'caught' && <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-500/20"><Check size={12}/> Caught</span>}
                            {route.status === 'failed' && <span className="flex items-center gap-1.5 bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-red-500/20"><X size={12}/> Failed</span>}
                            {route.status === 'skipped' && <span className="flex items-center gap-1.5 bg-zinc-700/30 text-zinc-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-zinc-600/30"><Circle size={12}/> Skipped</span>}
                            {route.status === 'empty' && <span className="flex items-center gap-1.5 bg-zinc-800/30 text-zinc-500 px-2.5 py-1 rounded-full text-xs font-semibold border border-zinc-700/30"><Circle size={12}/> Open</span>}
                        </div>
                        )}
                    </td>
                    
                    {/* Failed By */}
                    <td className="py-3 px-4">
                        {isEditing && (statusInput === 'failed' || statusInput === 'skipped') ? (
                             <div className="flex gap-1">
                                <button onClick={() => setFailedByInput(prev => prev.includes('player1') ? prev.filter(p => p !== 'player1') : [...prev, 'player1'])} className={`flex-1 text-[10px] px-1 py-0.5 rounded border transition font-bold uppercase ${failedByInput.includes('player1') ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}>P1</button>
                                <button onClick={() => setFailedByInput(prev => prev.includes('player2') ? prev.filter(p => p !== 'player2') : [...prev, 'player2'])} className={`flex-1 text-[10px] px-1 py-0.5 rounded border transition font-bold uppercase ${failedByInput.includes('player2') ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}>P2</button>
                                <button onClick={() => setFailedByInput(prev => prev.includes('player3') ? prev.filter(p => p !== 'player3') : [...prev, 'player3'])} className={`flex-1 text-[10px] px-1 py-0.5 rounded border transition font-bold uppercase ${failedByInput.includes('player3') ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}>P3</button>
                            </div>
                        ) : (
                             (route.status === 'failed' || route.status === 'skipped') && route.failedBy && (
                                <div className="flex flex-wrap gap-1">
                                    {route.failedBy.includes('player1') && <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">P1</span>}
                                    {route.failedBy.includes('player2') && <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20">P2</span>}
                                    {route.failedBy.includes('player3') && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">P3</span>}
                                </div>
                             )
                        )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                        {isEditing ? (
                        <div className="flex justify-end gap-2">
                            <button 
                            onClick={() => handleSave(route.id)}
                            className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors border border-emerald-500/20"
                            title="Save"
                            >
                            <Save size={16} />
                            </button>
                            <button 
                            onClick={handleCancel}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors border border-red-500/20"
                            title="Cancel"
                            >
                            <X size={16} />
                            </button>
                        </div>
                        ) : (
                         <div className="flex items-center justify-end gap-1">
                            {route.isCustom && (
                                <button 
                                    onClick={() => onDeleteRoute(route.id)}
                                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete Route"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <button 
                                onClick={() => handleStartEdit(route)}
                                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                title="Edit Route"
                            >
                                <Edit2 size={16} />
                            </button>
                         </div>
                        )}
                    </td>
                    </SortableRow>
                );
                })}
            </tbody>
           </SortableContext>
        </table>
       </DndContext>
      </div>
    </div>
  );
};

export default RouteTracker;
