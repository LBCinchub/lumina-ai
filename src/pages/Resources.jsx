import React, { useState } from 'react';
import { Search, FileText, Code2, Wrench, ChevronRight, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const RESOURCES = [
  {
    category: 'LBC.Network',
    description: 'Core protocol documentation and foundational tools',
    icon: '🌳',
    items: [
      { name: 'LBC Protocol Whitepaper', type: 'documentation', url: '#', icon: FileText },
      { name: 'LBC Architecture Guide', type: 'documentation', url: '#', icon: FileText },
      { name: 'LBC.js SDK', type: 'sdk', url: '#', icon: Code2 },
      { name: 'Protocol Validator Tool', type: 'tool', url: '#', icon: Wrench },
    ]
  },
  {
    category: 'LBCHub.io',
    description: 'Hub infrastructure, ecosystem tools, and integration guides',
    icon: '👥',
    items: [
      { name: 'Hub API Documentation', type: 'documentation', url: '#', icon: FileText },
      { name: 'Hub Integration Guide', type: 'documentation', url: '#', icon: FileText },
      { name: 'Hub Client SDK', type: 'sdk', url: '#', icon: Code2 },
      { name: 'Domain Manager Dashboard', type: 'tool', url: '#', icon: Wrench },
      { name: 'Hub CLI Toolkit', type: 'tool', url: '#', icon: Wrench },
    ]
  },
  {
    category: 'Portfolio Companies',
    description: 'Resources for LBC Protocol-powered portfolio ventures',
    icon: '🚀',
    items: [
      { name: 'Getting Started on LBCHub', type: 'documentation', url: '#', icon: FileText },
      { name: 'Portfolio Developer Guide', type: 'documentation', url: '#', icon: FileText },
      { name: 'Portfolio SDK Templates', type: 'sdk', url: '#', icon: Code2 },
      { name: 'Revenue Share Calculator', type: 'tool', url: '#', icon: Wrench },
    ]
  }
];

const TYPE_COLORS = {
  documentation: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  sdk: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  tool: 'bg-green-500/10 text-green-300 border-green-500/20',
};

const TYPE_LABELS = {
  documentation: 'Documentation',
  sdk: 'SDK',
  tool: 'Tool',
};

export default function Resources() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState(null);

  const filteredResources = RESOURCES.map(category => ({
    ...category,
    items: category.items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = !selectedType || item.type === selectedType;
      return matchesSearch && matchesType;
    })
  })).filter(category => category.items.length > 0);

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-20">
        {/* Header */}
        <div className="mb-12">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Developer hub
          </div>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-[1.05] mb-4">
            Resource Explorer
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl">
            Documentation, SDKs, and developer tools organized across the LBC.Network ecosystem hierarchy.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-10 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedType(null)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                !selectedType
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              All
            </button>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedType(selectedType === key ? null : key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                  selectedType === key
                    ? "bg-accent border-accent text-accent-foreground"
                    : "bg-card border-border hover:border-foreground/30"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Resource Categories */}
        <div className="space-y-8">
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No resources found matching your criteria.</p>
            </div>
          ) : (
            filteredResources.map((category) => (
              <div key={category.category} className="rounded-2xl border border-border bg-card/40 overflow-hidden">
                <div className="px-6 py-5 border-b border-border/60 bg-muted/30">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl">{category.icon}</span>
                    <h2 className="font-serif text-xl tracking-tight">{category.category}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>

                <div className="divide-y divide-border/60">
                  {category.items.map((item) => (
                    <a
                      key={item.name}
                      href={item.url}
                      className="px-6 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground group-hover:text-foreground/90 truncate">
                            {item.name}
                          </p>
                          <span className={cn(
                            "inline-block text-xs font-medium px-2 py-1 rounded-full border mt-1.5",
                            TYPE_COLORS[item.type]
                          )}>
                            {TYPE_LABELS[item.type]}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 ml-4" />
                    </a>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-14 pt-10 border-t border-border">
          <h2 className="font-serif text-2xl tracking-tight mb-6">Quick Links</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <a href="#" className="p-5 rounded-xl border border-border bg-card/40 hover:bg-accent/50 transition-colors flex items-center justify-between group">
              <span className="font-medium">LBC.Network GitHub</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#" className="p-5 rounded-xl border border-border bg-card/40 hover:bg-accent/50 transition-colors flex items-center justify-between group">
              <span className="font-medium">Developer Community</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#" className="p-5 rounded-xl border border-border bg-card/40 hover:bg-accent/50 transition-colors flex items-center justify-between group">
              <span className="font-medium">Bug Reports & Issues</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}