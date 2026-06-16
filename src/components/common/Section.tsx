import { ReactNode } from 'react';

interface SectionProps {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function Section({ title, actions, children }: SectionProps) {
  return (
    <section className="section">
      <div className="section__header">
        <h2 className="section__title">{title}</h2>
        {actions && <div className="section__actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
