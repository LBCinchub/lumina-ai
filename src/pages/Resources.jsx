import React, { useState } from 'react';
import { Book, Code, Terminal, Cpu, Search, ChevronRight, FileCode, Shield } from 'lucide-react';

const RESOURCES = [
  {
    id: 'sdk-01',
    category: 'SDKs',
    title: 'LBC Core TypeScript SDK',
    description: 'The primary entry point for building apps on the LBC protocol.',
    status: 'Stable',
    version: 'v2.4.0'
  },
  {
    id: 'api-01',
    category: 'API Reference',
    title: 'Mother Node REST API',
    description: 'Full documentation for interacting directly with lbc.network.',
    status: 'Updated',
    version: 'v1.1.2'
  },
  {
    id: 'sec-01',
    category: 'Security',
    title: 'Protocol Guard Implementation',
    description: 'Standard practices for securing handshakes between LBC nodes.',
    status: 'Critical',
    version: 'v1.0.0'
  }
];

const CategoryCard = ({ icon, title, count }) => (
  <div className="p-6 bg-slate-900/40 border border-white/[0.03] rounded-3xl hover:border-white/10 transition-all cursor-pointer">
    <div className="p-3 bg-white/5 w-fit rounded-xl mb-6">{icon}</div>
    <h4 className="text-lg font-bold mb-1">{title}</h4>
    <p className="text-xs text-white/20 font-mono uppercase tracking-widest">{count} Resources Available</p>
  </div>
);

export default function Resources() {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = RESOURCES.filter(r =>
    !searchQuery ||
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-10 bg-slate-950 min-h-screen font-sans text-emerald-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Book className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500/60 font-mono text-[10px] tracking-[0.3em] uppercase">LBC_Documentation_Hub</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter mb-2">Resource Library</h1>
            <p className="text-emerald-100/30 text-lg">Build the future of decentralized intelligence.</p>
          </div>

          <div className="w-full md:w-96 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40" />
            <input
              type="text"
              placeholder="Search protocol, SDKs, security..."
              className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-2xl py-4 pl-12 pr-6 text-sm focus:outline-none focus:border-emerald-500/40 transition-all placeholder:text-emerald-900 text-emerald-50"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <CategoryCard icon={<Code className="text-emerald-400" />} title="SDKs & Tooling" count={4} />
          <CategoryCard icon={<Terminal className="text-blue-400" />} title="API Reference" count={12} />
          <CategoryCard icon={<Shield className="text-amber-400" />} title="Security Protocols" count={3} />
        </div>

        {/* Resource List */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-mono font-bold text-emerald-500/40 uppercase tracking-widest mb-6">Featured_Resources</h3>
          {filtered.map(res => (
            <div key={res.id} className="group bg-slate-900/50 border border-white/[0.03] p-6 rounded-3xl hover:border-emerald-500/20 hover:bg-emerald-500/[0.02] transition-all flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-500/40 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-all">
                  <FileCode size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-lg font-bold text-white/90">{res.title}</h4>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-mono uppercase font-bold">{res.status}</span>
                  </div>
                  <p className="text-sm text-white/30">{res.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right hidden md:block">
                  <p className="text-[10px] text-white/20 font-mono uppercase tracking-widest">Version</p>
                  <p className="text-xs font-bold text-white/60">{res.version}</p>
                </div>
                <button className="p-3 bg-white/5 rounded-xl text-white/20 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-all">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-emerald-500/30 text-sm font-mono py-10">NO_RESOURCES_FOUND</p>
          )}
        </div>

        {/* Quick-Start Terminal */}
        <div className="mt-16 p-8 bg-black border border-emerald-500/10 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-emerald-500/5 opacity-50 group-hover:opacity-100 transition-opacity">
            <Cpu size={120} />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-4">Initialize the Protocol</h2>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full bg-slate-950 p-4 rounded-xl font-mono text-sm text-emerald-400 border border-emerald-500/20">
                <span className="text-emerald-900">$</span> npm install @lbc-protocol/sdk --core
              </div>
              <button className="w-full md:w-auto px-10 py-4 bg-emerald-500 text-black font-black rounded-xl hover:bg-emerald-400 transition-all">
                VIEW_DOCS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}