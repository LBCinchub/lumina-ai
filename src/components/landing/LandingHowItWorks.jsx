import React from 'react';

const STEPS = [
  {
    number: '1',
    title: 'Create Your Agent',
    description: 'Pick A Name, Write Its Personality And Instructions.',
  },
  {
    number: '2',
    title: 'Teach It',
    description: 'Add Knowledge And Let It Learn Your Style.',
  },
  {
    number: '3',
    title: 'Connect Your Phone',
    description: 'Pair It With Telegram And Message It Anytime.',
  },
];

// How It Works — three numbered steps.
export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-5">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
          How It Works
        </h2>
        <p className="mt-4 text-zinc-400 text-center max-w-xl mx-auto leading-relaxed">
          From Blank Slate To Your Personal Agent In Minutes.
        </p>

        <ol className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
          {STEPS.map((s, i) => (
            <li
              key={s.number}
              className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-6"
            >
              <span className="inline-flex w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 items-center justify-center text-white text-sm font-semibold" aria-hidden="true">
                {s.number}
              </span>
              <h3 className="mt-4 font-medium">
                <span className="sr-only">Step {s.number} — </span>
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{s.description}</p>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-pink-500/50 to-purple-600/50"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}