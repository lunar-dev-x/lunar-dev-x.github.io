import React, { useState, useEffect } from 'react';
import { Route } from '../types';
import { Check, X, Circle, Save, Edit2 } from 'lucide-react';
import { getAllPokemonNames } from '../utils/pokeApi';
import AutocompleteInput from './AutocompleteInput';

interface Props {
  routes: Route[];
  onUpdateRoute: (routeId: string, updates: Partial<Route>) => void;
  onCatch: (routeId: string, p1Species: string, p2Species: string, p3Species: string) => void;
}

const RouteTracker: React.FC<Props> = ({ routes, onUpdateRoute, onCatch }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [p1Input, setP1Input] = useState('');
  const [p2Input, setP2Input] = useState('');
  const [p3Input, setP3Input] = useState('');
  const [statusInput, setStatusInput] = useState<Route['status']>('empty');
  const [pokemonList, setPokemonList] = useState<string[]>([]);

  useEffect(() => {
    getAllPokemonNames().then(names => {
        // Capitalize names for better UX
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
  };

  const handleSave = (routeId: string) => {
    // If status is caught, we trigger the onCatch event which presumably adds to party/box
    if (statusInput === 'caught') {
        onCatch(routeId, p1Input, p2Input, p3Input);
    }
    
    onUpdateRoute(routeId, { 
      encounterP1: p1Input, 
      encounterP2: p2Input, 
      encounterP3: p3Input,
      status: statusInput
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 mt-8 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/20">
          <h2 className="text-lg font-semibold text-zinc-200">Route Tracker</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider bg-zinc-950/40">
              <th className="py-3 px-4 font-semibold">Location</th>
              <th className="py-3 px-4 font-semibold text-blue-400">Player 1 Encounter</th>
              <th className="py-3 px-4 font-semibold text-red-400">Player 2 Encounter</th>
              <th className="py-3 px-4 font-semibold text-emerald-400">Player 3 Encounter</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {routes.map(route => {
              const isEditing = editingId === route.id;
              return (
                <tr key={route.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition group">
                  <td className="py-3 px-4 font-medium text-sm text-zinc-300">{route.name}</td>
                  
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
                    ) : (
                       <div className="flex items-center">
                        {route.status === 'caught' && <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-500/20"><Check size={12}/> Caught</span>}
                        {route.status === 'failed' && <span className="flex items-center gap-1.5 bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-red-500/20"><X size={12}/> Failed</span>}
                        {route.status === 'skipped' && <span className="flex items-center gap-1.5 bg-zinc-700/30 text-zinc-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-zinc-600/30"><Circle size={12}/> Skipped</span>}
                        {route.status === 'empty' && <span className="flex items-center gap-1.5 bg-zinc-800/30 text-zinc-500 px-2.5 py-1 rounded-full text-xs font-semibold border border-zinc-700/30"><Circle size={12}/> Open</span>}
                       </div>
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
                      <button 
                        onClick={() => handleStartEdit(route)}
                         className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit Route"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RouteTracker;
