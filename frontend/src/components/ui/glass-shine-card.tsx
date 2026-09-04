import { cn } from "@/lib/utils";
import React from "react";

export const SampleCard: React.FC = () => {
  return (
    <div className={cn("container p-4 max-w-sm mx-auto")}>
      <div className="card relative overflow-hidden clay-card p-6 border border-white/80 rounded-3xl shadow-xl backdrop-blur-xl bg-white/70 transition-all duration-300 hover:shadow-2xl">
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-[#5c67f5]/20 rounded-full blur-2xl pointer-events-none"></div>
        <p className="innerText text-xs font-bold uppercase tracking-widest text-[#5c67f5] mb-1">SAMPLE TEXT</p>
        <h3 className="text-xl font-extrabold text-[#1e243a] mb-2 tracking-tight">Glass Shine Feature</h3>
        <p className="desc text-sm text-slate-600 leading-relaxed">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer id
          dictum augue, id viverra.
        </p>
      </div>
    </div>
  );
};
