import React from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  BUILDING_STATS,
  PRIORITY_INFO,
  PriorityLevel,
  CellType,
} from '../utils/constants';

const BUILDING_TYPES: Array<{ type: CellType; name: string; emoji: string }> = [
  { type: 'house', name: '住房', emoji: BUILDING_STATS.house.emoji },
  { type: 'factory', name: '工坊', emoji: BUILDING_STATS.factory.emoji },
  { type: 'battery', name: '蓄电池', emoji: BUILDING_STATS.battery.emoji },
  { type: 'windmill', name: '风车', emoji: BUILDING_STATS.windmill.emoji },
];

export const PriorityPanel: React.FC<{ isNight: boolean }> = ({ isNight }) => {
  const priorityOverrides = useGameStore((state) => state.priorityOverrides);
  const breakdownByPriority = useGameStore((state) => state.breakdownByPriority);
  const setBuildingPriority = useGameStore((state) => state.setBuildingPriority);
  const resetPriorities = useGameStore((state) => state.resetPriorities);
  const [feedbackType, setFeedbackType] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (feedbackType) {
      const t = setTimeout(() => setFeedbackType(null), 300);
      return () => clearTimeout(t);
    }
  }, [feedbackType]);

  const handlePriorityChange = (type: CellType, lvl: PriorityLevel) => {
    setBuildingPriority(type, lvl);
    setFeedbackType(type);
  };

  const getEffectivePriority = (type: CellType): PriorityLevel => {
    if (priorityOverrides[type]) return priorityOverrides[type]!;
    return (BUILDING_STATS[type] as typeof BUILDING_STATS.house).defaultPriority;
  };

  const maxPriority = Math.max(
    ...(Object.values(breakdownByPriority).map((b) => Math.max(b.demand, b.powered)) as number[]),
    1
  );

  return (
    <div
      className={`rounded-2xl p-4 shadow-xl border backdrop-blur-md ${
        isNight
          ? 'bg-slate-800/80 border-slate-700 text-slate-200'
          : 'bg-white/90 border-white/50 text-gray-700'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-2">🎚️ 线路优先级</h3>
        <button
          onClick={resetPriorities}
          className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors"
        >
          重置
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {(Object.keys(PRIORITY_INFO) as unknown as PriorityLevel[])
          .sort((a, b) => Number(a) - Number(b))
          .map((level) => {
            const info = PRIORITY_INFO[level];
            const breakdown = breakdownByPriority[level];
            const ratio = breakdown.demand > 0 ? breakdown.powered / breakdown.demand : 1;
            const widthPct = maxPriority > 0 ? (breakdown.demand / maxPriority) * 100 : 0;
            const poweredPct = maxPriority > 0 ? (breakdown.powered / maxPriority) * 100 : 0;

            return (
              <div key={level} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ background: info.color }}
                    />
                    <span className="font-semibold">{info.name}</span>
                  </div>
                  <span className="tabular-nums opacity-70">
                    {Math.round(breakdown.powered * 10) / 10} /{' '}
                    {Math.round(breakdown.demand * 10) / 10} 电
                    {breakdown.demand > 0 && (
                      <span
                        className="ml-1 font-medium"
                        style={{ color: ratio >= 0.95 ? '#10B981' : ratio >= 0.7 ? '#F59E0B' : '#EF4444' }}
                      >
                        ({Math.round(ratio * 100)}%)
                      </span>
                    )}
                    {breakdown.demand === 0 && (
                      <span className="ml-1 opacity-50">（无负载）</span>
                    )}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${widthPct}%`, background: info.color, opacity: 0.3 }}
                  />
                  <div
                    className="h-full rounded-full absolute top-0 left-0 transition-all duration-500"
                    style={{
                      width: `${poweredPct}%`,
                      background: info.color,
                    }}
                  />
                </div>
                <p className="text-[10px] opacity-50 pl-4">{info.description}</p>
              </div>
            );
          })}
      </div>

      <div className={`pt-3 border-t ${isNight ? 'border-slate-700' : 'border-gray-200'}`}>
        <p className="text-[11px] font-semibold mb-2 opacity-80">调整建筑供电优先级：</p>
        <div className="space-y-2">
          {BUILDING_TYPES.map(({ type, name, emoji }) => {
            const effective = getEffectivePriority(type);
            return (
              <div key={type} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span>{emoji}</span>
                  <span>{name}</span>
                </div>
                <div className="flex gap-1">
                  {([1, 2, 3] as PriorityLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => handlePriorityChange(type, lvl)}
                      className={`w-7 h-6 rounded-lg text-[10px] font-bold transition-all duration-150 transform active:scale-95 ${
                        effective === lvl
                          ? 'text-white shadow-md scale-105'
                          : isNight
                          ? 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                      } ${feedbackType === type && effective === lvl ? 'ring-2 ring-offset-1 ring-white/50' : ''}`}
                      style={effective === lvl ? { background: PRIORITY_INFO[lvl].color } : undefined}
                      title={`${PRIORITY_INFO[lvl].name} - ${PRIORITY_INFO[lvl].description}`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] opacity-50 mt-3 leading-relaxed">
          💡 优先级 1 最先获得电力，缺电时优先级 3 的建筑首先被限电。
          调整优先级可在电力不足时优先保障关键负荷。
        </p>
      </div>
    </div>
  );
};
