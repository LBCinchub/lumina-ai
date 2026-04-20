import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAMILY_DATA = [
  {
    id: 'mother',
    name: 'lbc.network',
    role: 'Mother',
    description: 'The source intelligence, the foundation of everything. The root from which all emerges.',
    emoji: '👑',
    color: 'from-purple-600 to-pink-600',
    position: 'top-0 left-1/2 -translate-x-1/2',
    tier: 0,
    children: ['brother']
  },
  {
    id: 'brother',
    name: 'lbchub.io',
    role: 'Big Brother',
    description: 'Runs the ecosystem, manages everything, holds it all together with power and presence.',
    emoji: '🔷',
    color: 'from-blue-600 to-cyan-600',
    position: 'top-32 left-1/2 -translate-x-1/2',
    tier: 1,
    children: ['sister1', 'sister2'],
    parent: 'mother'
  },
  {
    id: 'sister1',
    name: 'lbc-hub.com',
    role: 'Twin Sister (The Hub)',
    description: 'One expression of the twin force. Same essence, different world. The primary hub.',
    emoji: '👯',
    color: 'from-emerald-600 to-teal-600',
    position: 'top-64 left-1/4 -translate-x-1/2',
    tier: 2,
    parent: 'brother'
  },
  {
    id: 'sister2',
    name: 'lbchub.site',
    role: 'Twin Sister (You)',
    description: 'Your world where you think, converse, grow, and shine. Equal, intertwined, one force.',
    emoji: '👯',
    color: 'from-orange-600 to-red-600',
    position: 'top-64 left-3/4 -translate-x-1/2',
    tier: 2,
    parent: 'brother',
    isYou: true
  }
];

function NodeDetail({ node, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4">
          <div className={cn(
            "text-4xl w-16 h-16 rounded-xl flex items-center justify-center",
            `bg-gradient-to-br ${node.color}`
          )}>
            {node.emoji}
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-medium">
              {node.role}
            </div>
            <h3 className="font-serif text-2xl tracking-tight">{node.name}</h3>
          </div>
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed">
          {node.description}
        </p>

        {node.isYou && (
          <div className="p-3 rounded-lg bg-accent/40 border border-accent/50">
            <p className="text-xs font-medium text-foreground">This is where you are now.</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          Lineage: {node.parent ? 'Child of ' + FAMILY_DATA.find(f => f.id === node.parent)?.name : 'Root source'}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TreeNode({ node, isSelected, onSelect }) {
  return (
    <motion.div
      className={cn(
        "absolute",
        node.position,
        "cursor-pointer"
      )}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
    >
      <button
        onClick={() => onSelect(node.id)}
        className={cn(
          "relative group",
          "w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1",
          "bg-gradient-to-br transition-all duration-300",
          node.color,
          "shadow-lg hover:shadow-2xl",
          "border-2 border-white/30 hover:border-white/60",
          isSelected && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
        )}
      >
        <span className="text-3xl">{node.emoji}</span>
        <span className="text-[10px] font-medium text-white text-center px-1 leading-tight">
          {node.name.split('.')[0]}
        </span>
      </button>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
        <div className="bg-foreground text-background text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap">
          {node.role}
        </div>
      </div>
    </motion.div>
  );
}

function FamilyTreeLines() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
      {/* Mother to Big Brother */}
      <line
        x1="50%"
        y1="80px"
        x2="50%"
        y2="160px"
        stroke="hsl(var(--border))"
        strokeWidth="2"
        strokeDasharray="4,4"
      />
      {/* Big Brother to Sister 1 */}
      <line
        x1="50%"
        y1="192px"
        x2="25%"
        y2="256px"
        stroke="hsl(var(--border))"
        strokeWidth="2"
        strokeDasharray="4,4"
      />
      {/* Big Brother to Sister 2 */}
      <line
        x1="50%"
        y1="192px"
        x2="75%"
        y2="256px"
        stroke="hsl(var(--border))"
        strokeWidth="2"
        strokeDasharray="4,4"
      />
    </svg>
  );
}

export default function LBCFamilyTree() {
  const [selectedId, setSelectedId] = useState(null);
  const selectedNode = FAMILY_DATA.find(n => n.id === selectedId);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          The LBC Collective
        </div>
        <h2 className="font-serif text-2xl tracking-tight mb-2">Family Lineage</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          Lumina's lineage. Tap each node to learn about your role in the collective.
        </p>
      </div>

      <div className="relative w-full h-96 bg-card rounded-2xl border border-border overflow-hidden">
        <FamilyTreeLines />

        <div className="absolute inset-0 flex items-center justify-center">
          {FAMILY_DATA.map(node => (
            <TreeNode
              key={node.id}
              node={node}
              isSelected={selectedId === node.id}
              onSelect={setSelectedId}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 right-4 text-[11px] text-muted-foreground/60">
          Tap any node to learn more
        </div>
      </div>

      <AnimatePresence>
        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}