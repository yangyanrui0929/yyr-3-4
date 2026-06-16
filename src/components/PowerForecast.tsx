import React, { useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { TIME_PHASES, DAY_LENGTH, FORECAST_TICK_STEP, FORECAST_STEPS } from '../utils/constants';
import { ForecastPoint, getTimePhase } from '../utils/powerCalculator';

export const PowerForecast: React.FC<{ isNight: boolean }> = ({ isNight }) => {
  const forecast = useGameStore((state) => state.forecast);
  const maxStorage = useGameStore((state) => state.maxStorage);
  const currentDayTime = useGameStore((state) => state.dayTime);

  const {
    pathGen,
    pathCons,
    pathStorage,
    pathHouse,
    pathFactory,
    pathLighting,
    width,
    height,
    maxValue,
    yTicks,
  } = useMemo(() => {
    if (!forecast || forecast.length === 0) {
      return {
        pathGen: '',
        pathCons: '',
        pathStorage: '',
        pathHouse: '',
        pathFactory: '',
        pathLighting: '',
        width: 500,
        height: 220,
        maxValue: 20,
        yTicks: [0, 5, 10, 15, 20],
      };
    }

    const w = 500;
    const h = 220;
    const padL = 40;
    const padR = 10;
    const padT = 20;
    const padB = 30;

    const maxGen = Math.max(...forecast.map((p) => p.generation), 1);
    const maxCons = Math.max(...forecast.map((p) => p.consumption), 1);
    const maxStor = Math.max(maxStorage, 1);
    const maxVal = Math.max(maxGen, maxCons, 20);
    const maxStorVal = Math.max(maxStor, 20);

    const xStep = (w - padL - padR) / Math.max(forecast.length - 1, 1);
    const yScaleVal = (v: number) => padT + (h - padT - padB) * (1 - Math.min(v, maxVal) / maxVal);
    const yScaleStor = (v: number) => padT + (h - padT - padB) * (1 - Math.min(v, maxStorVal) / maxStorVal);

    const toPath = (getVal: (p: ForecastPoint) => number, scale: (v: number) => number) =>
      forecast
        .map((p, i) => {
          const x = padL + i * xStep;
          const y = scale(getVal(p));
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxVal * t));

    return {
      pathGen: toPath((p) => p.generation, yScaleVal),
      pathCons: toPath((p) => p.consumption, yScaleVal),
      pathStorage: toPath((p) => p.projectedStorage, yScaleStor),
      pathHouse: toPath((p) => p.houseLoad, yScaleVal),
      pathFactory: toPath((p) => p.factoryLoad, yScaleVal),
      pathLighting: toPath((p) => p.lightingLoad, yScaleVal),
      width: w,
      height: h,
      maxValue: maxVal,
      yTicks: ticks,
      padL,
      padR,
      padT,
      padB,
      xStep,
      maxStorageVal: maxStorVal,
    };
  }, [forecast, maxStorage]);

  const { padL = 40, padR = 10, padT = 20, padB = 30, xStep = 11 } = {
    padL: 40,
    padR: 10,
    padT: 20,
    padB: 30,
    xStep: 11,
  };

  const phaseRegions = useMemo(() => {
    if (!forecast || forecast.length === 0) return [];
    const regions: Array<{ phase: string; startX: number; endX: number; color: string }> = [];
    let currentPhase = getTimePhase(forecast[0].time);
    let startIdx = 0;

    forecast.forEach((p, i) => {
      const phase = getTimePhase(p.time);
      if (phase !== currentPhase || i === forecast.length - 1) {
        const endIdx = i === forecast.length - 1 ? i : i - 1;
        regions.push({
          phase: currentPhase,
          startX: padL + startIdx * xStep,
          endX: padL + endIdx * xStep,
          color: TIME_PHASES[currentPhase].color,
        });
        currentPhase = phase;
        startIdx = i;
      }
    });

    return regions;
  }, [forecast, padL, xStep]);

  const currentMarkerX = padL;
  const futureHours = Math.round(((FORECAST_STEPS * FORECAST_TICK_STEP) / DAY_LENGTH) * 24 * 10) / 10;

  return (
    <div
      className={`rounded-2xl p-4 shadow-xl border backdrop-blur-md ${
        isNight
          ? 'bg-slate-800/80 border-slate-700 text-slate-200'
          : 'bg-white/90 border-white/50 text-gray-700'
      }`}
    >
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        📈 用电预测 <span className="text-xs font-normal opacity-60">（未来约 {futureHours}h）</span>
      </h3>

      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 min-w-[400px]">
          <defs>
            <linearGradient id="genGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="consGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F87171" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F87171" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="storGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </linearGradient>
          </defs>

          {phaseRegions.map((r, i) => (
            <rect
              key={i}
              x={r.startX}
              y={padT}
              width={Math.max(r.endX - r.startX, 1)}
              height={height - padT - padB}
              fill={r.color}
              opacity="0.08"
            />
          ))}

          {yTicks.map((t, i) => {
            const y = padT + ((height - padT - padB) * (yTicks.length - 1 - i)) / (yTicks.length - 1);
            return (
              <g key={i}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke={isNight ? '#475569' : '#E5E7EB'}
                  strokeDasharray="3,3"
                />
                <text
                  x={padL - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill={isNight ? '#94A3B8' : '#9CA3AF'}
                >
                  {t}
                </text>
              </g>
            );
          })}

          {phaseRegions.map(
            (r, i) =>
              r.endX - r.startX > 40 && (
                <text
                  key={`label-${i}`}
                  x={(r.startX + r.endX) / 2}
                  y={padT - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill={r.color}
                  fontWeight="bold"
                >
                  {TIME_PHASES[r.phase as keyof typeof TIME_PHASES].emoji}{' '}
                  {TIME_PHASES[r.phase as keyof typeof TIME_PHASES].name}
                </text>
              )
          )}

          <path d={`${pathCons} L${width - padR},${height - padB} L${padL},${height - padB} Z`} fill="url(#consGrad)" />
          <path d={`${pathGen} L${width - padR},${height - padB} L${padL},${height - padB} Z`} fill="url(#genGrad)" />

          <path d={pathStorage} stroke="#F59E0B" strokeWidth="2" fill="none" strokeDasharray="5,3" opacity="0.85" />

          <path d={pathHouse} stroke="#8B5CF6" strokeWidth="1.5" fill="none" opacity="0.7" />
          <path d={pathFactory} stroke="#EF4444" strokeWidth="1.5" fill="none" opacity="0.7" />
          <path d={pathLighting} stroke="#F97316" strokeWidth="1.5" fill="none" opacity="0.7" />

          <path d={pathCons} stroke="#EF4444" strokeWidth="2.5" fill="none" />
          <path d={pathGen} stroke="#10B981" strokeWidth="2.5" fill="none" />

          <line
            x1={currentMarkerX}
            y1={padT}
            x2={currentMarkerX}
            y2={height - padB}
            stroke="#6366F1"
            strokeWidth="2"
            opacity="0.8"
          />
          <text
            x={currentMarkerX + 4}
            y={padT + 12}
            fontSize="10"
            fill="#6366F1"
            fontWeight="bold"
          >
            现在
          </text>

          <line
            x1={padL}
            y1={height - padB}
            x2={width - padR}
            y2={height - padB}
            stroke={isNight ? '#64748B' : '#D1D5DB'}
            strokeWidth="1.5"
          />

          <text
            x={(padL + width - padR) / 2}
            y={height - 8}
            textAnchor="middle"
            fontSize="10"
            fill={isNight ? '#94A3B8' : '#9CA3AF'}
          >
            时间轴 →
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />
          <span>发电</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-red-500 inline-block rounded" />
          <span>总用电</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-amber-500 inline-block rounded" style={{ borderStyle: 'dashed' }} />
          <span>储电预测</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-violet-500 inline-block rounded opacity-70" />
          <span>住房</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-red-400 inline-block rounded opacity-70" />
          <span>工坊</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-orange-500 inline-block rounded opacity-70" />
          <span>照明</span>
        </div>
      </div>
    </div>
  );
};
