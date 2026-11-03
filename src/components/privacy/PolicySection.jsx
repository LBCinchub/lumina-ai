import React from 'react';

// One section of the privacy policy: a heading, paragraphs, and an optional
// list of points (each with an optional bold label and an outside link).
export default function PolicySection({ section }) {
  const { title, paragraphs = [], points = [] } = section;
  return (
    <section>
      <h2 className="font-serif text-2xl tracking-tight mb-3">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-foreground/85">
        {paragraphs.map((p) => <p key={p}>{p}</p>)}
        {points.length > 0 && (
          <ul className="list-disc pl-5 space-y-2.5 marker:text-muted-foreground">
            {points.map((pt) => (
              <li key={pt.text}>
                {pt.label && <strong className="font-medium text-foreground">{pt.label}. </strong>}
                {pt.text}
                {pt.link && (
                  <>
                    {' '}
                    <a href={pt.link.href} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                      {pt.link.label}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}