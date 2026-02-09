import React, { useState } from 'react';
import { Route } from '../types';
import { Check, X, Circle } from 'lucide-react';

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

  const handleStartEdit = (route: Route) => {
    setEditingId(route.id);
    setP1Input(route.encounterP1 || '');
    setP2Input(route.encounterP2 || '');
    setP3Input(route.encounterP3 || '');
  };

  const handleSave = (routeId: string) => {
    if (p1Input && p2Input && p3Input) {
      onCatch(routeId, p1Input, p2Input, p3Input);
    }
    const allEntered = p1Input && p2Input && p3Input;
    onUpdateRoute(routeId, { 
      encounterP1: p1Input, 
      encounterP2: p2Input, 
      encounterP3: p3Input,
      status: allEntered ? 'caught' : 'empty' 
    });
    setEditingId(null);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mt-8">
      <h2 className="text-xl font-bold mb-4 text-white">Route Tracker</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-sm">
              <th className="py-2 px-4">Location</th>
              <th className="py-2 px-4 text-blue-400">Player 1 Encounter</th>
              <th className="py-2 px-4 text-red-400">Player 2 Encounter</th>
              <th className="py-2 px-4 text-green-400">Player 3 Encounter</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {routes.map(route => {
              const isEditing = editingId === route.id;
              return (
                <tr key={route.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                  <td className="py-3 px-4 font-medium">{route.name}</td>
                  
                  {/* P1 Input */}
                  <td className="py-3 px-4">
                    {isEditing ? (
                      <input 
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm w-full text-blue-200 focus:border-blue-500 outline-none"
                        value={p1Input}
                        onChange={(e) => setP1Input(e.target.value)}
                        placeholder="Pokemon Name"
                      />
                    ) : (
                      <span className="text-blue-200">{route.encounterP1 || '-'}</span>
                    )}
                  </td>

                  {/* P2 Input */}
                  <td className="py-3 px-4">
                    {isEditing ? (
                      <input 
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm w-full text-red-200 focus:border-red-500 outline-none"
                        value={p2Input}
                        onChange={(e) => setP2Input(e.target.value)}
                        placeholder="Pokemon Name"
                      />
                    ) : (
                      <span className="text-red-200">{route.encounterP2 || '-'}</span>
                    )}
                  </td>

                  {/* P3 Input */}
                  <td className="py-3 px-4">
                    {isEditing ? (
                      <input 
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm w-full text-green-200 focus:border-green-500 outline-none"
                        value={p3Input}
                        onChange={(e) => setP3Input(e.target.value)}
                        placeholder="Pokemon Name"
                      />
                    ) : (
                      <span className="text-green-200">{route.encounterP3 || '-'}</span>
                    )}
                  </td>

                  {/* Status Icon */}
                  <td className="py-3 px-4">
                     {route.status === 'caught' && <span className="flex items-center gap-1 text-green-400 text-xs uppercase font-bold"><Check size={14}/> Caught</span>}
                     {route.status === 'failed' && <span className="flex items-center gap-1 text-red-400 text-xs uppercase font-bold"><X size={14}/> Failed</span>}
                     {route.status === 'empty' && <span className="flex items-center gap-1 text-gray-500 text-xs uppercase font-bold"><Circle size={14}/> Open</span>}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4">
                    {isEditing ? (
                      <button 
                        onClick={() => handleSave(route.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleStartEdit(route)}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded text-xs"
                      >
                        Log
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
