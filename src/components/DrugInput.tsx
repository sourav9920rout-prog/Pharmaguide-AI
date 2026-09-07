import React, { useState, useEffect, useRef } from 'react';
import { COMMON_DRUGS } from '../constants/drugs';
import { BRAND_TO_GENERIC_MAP } from '../services/geminiService';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

interface DrugSuggestion {
  name: string;
  isBrand: boolean;
  genericTarget?: string;
}

interface DrugInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  containerClassName?: string;
}

export function DrugInput({ value, onChange, onEnter, className, containerClassName = '', ...props }: DrugInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      return;
    }

    const lower = trimmed.toLowerCase();
    const results: DrugSuggestion[] = [];
    const seen = new Set<string>();

    // 1. Check known brand mapping first
    Object.entries(BRAND_TO_GENERIC_MAP).forEach(([brand, gen]) => {
      if (brand.includes(lower)) {
        const formatted = brand.charAt(0).toUpperCase() + brand.slice(1);
        if (!seen.has(formatted.toLowerCase())) {
          seen.add(formatted.toLowerCase());
          results.push({
            name: formatted,
            isBrand: true,
            genericTarget: gen.charAt(0).toUpperCase() + gen.slice(1)
          });
        }
      }
    });

    // 2. Filter from master COMMON_DRUGS
    for (const drug of COMMON_DRUGS) {
      if (results.length >= 35) break;
      if (drug.toLowerCase().includes(lower) && !seen.has(drug.toLowerCase())) {
        seen.add(drug.toLowerCase());
        results.push({
          name: drug,
          isBrand: false
        });
      }
    }

    setSuggestions(results.slice(0, 30));

    // 3. Optional async query in brand_map_v2 for dynamic brands
    if (trimmed.length >= 3 && results.length < 15) {
      let isCancelled = false;
      const start = lower;
      const end = lower + '\uf8ff';
      const q = query(
        collection(db, 'brand_map_v2'),
        where('brandName', '>=', start),
        where('brandName', '<=', end),
        limit(10)
      );
      getDocs(q).then(snapshot => {
        if (isCancelled || snapshot.empty) return;
        setSuggestions(prev => {
          const updated = [...prev];
          const currentKeys = new Set(updated.map(s => s.name.toLowerCase()));
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const brandName = data.brandName;
            if (brandName && !currentKeys.has(brandName.toLowerCase())) {
              const formatted = brandName.charAt(0).toUpperCase() + brandName.slice(1);
              currentKeys.add(brandName.toLowerCase());
              updated.push({
                name: formatted,
                isBrand: true,
                genericTarget: data.genericName ? (data.genericName.charAt(0).toUpperCase() + data.genericName.slice(1)) : undefined
              });
            }
          });
          return updated.slice(0, 30);
        });
      }).catch(() => {});

      return () => {
        isCancelled = true;
      };
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${containerClassName}`} ref={dropdownRef}>
      <input
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            setShowSuggestions(false);
            onEnter();
          }
          if (props.onKeyDown) {
            props.onKeyDown(e);
          }
        }}
        {...props}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface-bright border border-glass-border rounded-xl shadow-ambient max-h-64 overflow-y-auto custom-scrollbar">
          {suggestions.map((item, i) => (
            <div
              key={i}
              className="px-4 py-2.5 hover:bg-glass border-b border-glass-border/30 last:border-0 cursor-pointer text-on-surface text-sm transition-colors text-left flex items-center justify-between gap-3"
              onClick={() => {
                onChange(item.name);
                setShowSuggestions(false);
              }}
            >
              <span className="font-medium">{item.name}</span>
              {item.isBrand && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/20 shrink-0">
                  {item.genericTarget ? `Brand · ${item.genericTarget}` : 'Brand Name'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
