import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Zap, Battery, Smile, Meh, Frown, Home, Factory, Lightbulb } from 'lucide-react';
import { TIME_PHASES, DAY_LENGTH } from '../utils/constants';
import { getTimePhase } from '../utils/powerCalculator';

export const StatusBar: React.FC = () => {
  const {
    dayTime,
    totalGeneration,
    totalConsumption,
    houseConsumption,
    factoryConsumption,
    lightingConsumption,
    storedPower,
    maxStorage,
    satisfaction,
    openSettlement,
  } = useGameStore();

  const phase = getTimePhase(dayTime);
  const phaseInfo = TIME_PHASES[phase];
  const isNight = phase === 'night' || phase === 'dusk';
  const netPower = Math.round((totalGeneration - totalConsumption) * 10) / 10;
  const storagePercent = maxStorage > 0 ? (storedPower / maxStorage) * 100 : 0;
  const progress = ((dayTime % DAY_LENGTH) + DAY_LENGTH) % DAY_LENGTH;

  const getSatisfactionIcon = () => {
    if (satisfaction >= 70) return <Smile className="w-5 h-5 text-green-500" />;
    if (satisfaction >= 40) return <Meh className="w-5 h-5 text-yellow-500" />;
    return <Frown className="w-5 h-5 text-red-500" />;
  };

  const getSatisfactionText = () => {
    if (satisfaction >= 80) return '非常满意';
    if (satisfaction >= 60) return '比较满意';
    if (satisfaction >= 40) return '一般';
    if (satisfaction >= 20) return '不太满意';
    return '非常不满';
  };

  const bgClass = isNight
    ? 'bg-slate-800/90 border-slate-700 text-slate-200'
    : 'bg-white/90 border-white/50 text-gray-700';

  return (
    <div
      className={`${bgClass} backdrop-blur-md rounded-2xl p-4 shadow-xl border`}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 text-xl"
            style={{ background: `${phaseInfo.color}22` }}
          >
            {phaseInfo.emoji}
          </div>
          <div>
            <p
              className="text-xs font-semibold"
              style={{ color: phaseInfo.color }}
            >
              {phaseInfo.name}
            </p>
            <div className="w-28 h-2 rounded-full overflow-hidden" style={{ background: isNight ? '#334155' : '#E5E7EB' }}>
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${TIME_PHASES.dawn.color}, ${TIME_PHASES.day.color} 25%, ${TIME_PHASES.dusk.color} 65%, ${TIME_PHASES.night.color})`,
                }}
              />
            </div>
          </div>
        </div>

        <div className={`h-10 w-px ${isNight ? 'bg-slate-700' : 'bg-gray-200'}`} />

        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isNight ? 'bg-blue-900/50' : 'bg-blue-50'}`}>
            <Zap className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>电力</p>
            <p className="text-sm font-bold tabular-nums">
              <span className="text-green-500">+{Math.round(totalGeneration * 10) / 10}</span>
              <span className={`mx-1 ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>/</span>
              <span className="text-red-400">-{Math.round(totalConsumption * 10) / 10}</span>
            </p>
            <p
              className={`text-xs font-semibold tabular-nums ${
                netPower >= 0 ? 'text-green-500' : 'text-red-400'
              }`}
            >
              {netPower >= 0 ? '▲' : '▼'} {Math.abs(netPower)}
            </p>
          </div>
        </div>

        <div className={`h-10 w-px ${isNight ? 'bg-slate-700' : 'bg-gray-200'}`} />

        <div className="flex items-center gap-1.5">
          <div className="flex flex-col gap-0.5 text-[10px]">
            <div className="flex items-center gap-1">
              <Home className="w-3 h-3 text-violet-400" />
              <span className="tabular-nums opacity-80">
                {Math.round(houseConsumption * 10) / 10}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Factory className="w-3 h-3 text-red-400" />
              <span className="tabular-nums opacity-80">
                {Math.round(factoryConsumption * 10) / 10}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-orange-400" />
              <span className="tabular-nums opacity-80">
                {Math.round(lightingConsumption * 10) / 10}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 text-[9px] opacity-60 pl-0.5">
            <span>住房</span>
            <span>工坊</span>
            <span>照明</span>
          </div>
        </div>

        <div className={`h-10 w-px ${isNight ? 'bg-slate-700' : 'bg-gray-200'}`} />

        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isNight ? 'bg-amber-900/40' : 'bg-amber-50'}`}>
            <Battery className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>蓄电池</p>
            <p className="text-sm font-bold tabular-nums">
              {Math.round(storedPower)} / {maxStorage}
            </p>
            <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: isNight ? '#334155' : '#E5E7EB' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${storagePercent}%`,
                  background:
                    storagePercent > 60
                      ? 'linear-gradient(90deg, #34D399, #10B981)'
                      : storagePercent > 30
                      ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                      : 'linear-gradient(90deg, #F87171, #EF4444)',
                }}
              />
            </div>
          </div>
        </div>

        <div className={`h-10 w-px ${isNight ? 'bg-slate-700' : 'bg-gray-200'}`} />

        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isNight ? 'bg-pink-900/40' : 'bg-pink-50'}`}>
            {getSatisfactionIcon()}
          </div>
          <div>
            <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>居民满意度</p>
            <p className="text-sm font-bold">{getSatisfactionText()}</p>
            <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: isNight ? '#334155' : '#E5E7EB' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${satisfaction}%`,
                  background:
                    satisfaction >= 60
                      ? 'linear-gradient(90deg, #34D399, #10B981)'
                      : satisfaction >= 30
                      ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                      : 'linear-gradient(90deg, #F87171, #EF4444)',
                }}
              />
            </div>
          </div>
        </div>

        <div className={`h-10 w-px ${isNight ? 'bg-slate-700' : 'bg-gray-200'}`} />

        <button
          onClick={openSettlement}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-2 px-4 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 text-sm"
        >
          📊 结算
        </button>
      </div>
    </div>
  );
};
