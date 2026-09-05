interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-14 mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-[24px] font-extrabold text-on-surface tracking-tight capitalize">{title}</h1>
        <div className="relative flex items-center w-80">
          <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[19px] pointer-events-none">search</span>
          <input 
            className="w-full pl-9 pr-4 py-2 rounded-full clay-pill text-on-surface placeholder:text-slate-400 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" 
            placeholder="Search incidents, services, or alerts…" 
            type="text"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 clay-pill cursor-pointer hover:bg-slate-50/80 transition-all text-on-surface font-semibold text-[13px]">
          <span className="material-symbols-outlined text-[17px] text-slate-400">calendar_today</span>
          <span>May 06 – Jun 05, 2024</span>
          <span className="material-symbols-outlined text-[17px] text-slate-400">expand_more</span>
        </div>
      </div>
    </header>
  );
}
