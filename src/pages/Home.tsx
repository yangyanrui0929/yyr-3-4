import { FloatingIsland } from '@/components/FloatingIsland';
import { Toolbar } from '@/components/Toolbar';
import { StatusBar } from '@/components/StatusBar';
import { SettlementModal } from '@/components/SettlementModal';
import { PowerForecast } from '@/components/PowerForecast';
import { PriorityPanel } from '@/components/PriorityPanel';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useGameStore } from '@/store/useGameStore';
import { getTimePhase } from '@/utils/powerCalculator';

export default function Home() {
  useGameLoop();
  const dayTime = useGameStore((state) => state.dayTime);
  const phase: string = getTimePhase(dayTime);
  const isNight = phase === 'night' || phase === 'dusk';

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden transition-colors duration-1000"
      style={{
        background: isNight
          ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 40%, #334155 100%)'
          : phase === 'dawn'
          ? 'linear-gradient(180deg, #FDB99B 0%, #FDB347 30%, #FCEABB 70%, #B3E5FC 100%)'
          : phase === 'dusk'
          ? 'linear-gradient(180deg, #7C3AED 0%, #DB2777 30%, #F97316 60%, #FCD34D 100%)'
          : 'linear-gradient(180deg, #87CEEB 0%, #B3E5FC 40%, #E0F7FA 100%)',
      }}
    >
      <Clouds isNight={isNight} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
        <header className="text-center">
          <h1
            className={`text-4xl font-extrabold mb-2 tracking-tight ${
              isNight ? 'text-white' : 'text-gray-800'
            }`}
            style={{
              textShadow: isNight
                ? '0 2px 20px rgba(99, 102, 241, 0.5)'
                : '0 2px 10px rgba(255,255,255,0.8)',
            }}
          >
            🏝️ 浮岛电网 · 智慧调度
          </h1>
          <p className={`text-sm ${isNight ? 'text-slate-300' : 'text-gray-600'}`}>
            根据居民作息调整电网，提前储电、调度优先级，让电网从静态连接变成时间调度！
          </p>
        </header>

        <StatusBar />

        <PowerForecast isNight={isNight} />

        <div className="flex flex-col xl:flex-row gap-6 items-start justify-center">
          <div className="order-2 xl:order-1 w-full xl:w-64 space-y-4">
            <Toolbar />
          </div>

          <div className="order-1 xl:order-2 flex justify-center items-center py-4">
            <FloatingIsland />
          </div>

          <div className="order-3 w-full xl:w-72 space-y-4">
            <PriorityPanel isNight={isNight} />
            <GameGuide isNight={isNight} />
          </div>
        </div>

        <footer className="text-center pb-4">
          <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
            ⚡ 智慧调度：清晨关注住房高峰 · 白天保障工坊生产 · 傍晚准备照明需求 · 深夜仅留基础负载
          </p>
        </footer>
      </div>

      <SettlementModal />
    </div>
  );
}

function Clouds({ isNight }: { isNight: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-60"
          style={{
            width: `${100 + i * 40}px`,
            height: `${40 + i * 15}px`,
            top: `${5 + i * 18}%`,
            left: `${-10 + i * 22}%`,
            background: isNight
              ? 'radial-gradient(ellipse, rgba(148,163,184,0.3) 0%, transparent 70%)'
              : 'radial-gradient(ellipse, white 0%, rgba(255,255,255,0) 70%)',
            animation: `drift ${25 + i * 8}s linear infinite`,
            animationDelay: `${-i * 5}s`,
          }}
        />
      ))}
      {isNight && (
        <>
          {[...Array(30)].map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                top: `${Math.random() * 55}%`,
                left: `${Math.random() * 100}%`,
                opacity: 0.3 + Math.random() * 0.7,
                animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </>
      )}
      <style>{`
        @keyframes drift {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(calc(100vw + 100px)); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function GameGuide({ isNight }: { isNight: boolean }) {
  return (
    <div
      className={`rounded-2xl p-4 shadow-xl border backdrop-blur-md ${
        isNight
          ? 'bg-slate-800/80 border-slate-700 text-slate-200'
          : 'bg-white/90 border-white/50 text-gray-700'
      }`}
    >
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">📖 时段用电指南</h3>
      <ul className="text-xs space-y-2.5">
        <li className="flex items-start gap-2">
          <span className="text-base">🌅</span>
          <div>
            <b className="text-amber-600 dark:text-amber-400">清晨</b>：居民起床，<b>住房用电激增</b>（做饭、热水）
          </div>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-base">☀️</span>
          <div>
            <b className="text-yellow-600 dark:text-yellow-400">白天</b>：<b>工坊满负荷生产</b>，风车发电最多
          </div>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-base">🌇</span>
          <div>
            <b className="text-orange-600 dark:text-orange-400">傍晚</b>：<b>全岛照明需求</b>骤增，发电开始下降
          </div>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-base">🌙</span>
          <div>
            <b className="text-indigo-500 dark:text-indigo-400">深夜</b>：仅保留<b>基础负载</b>，靠蓄电池供电
          </div>
        </li>
      </ul>
      <div className="mt-4 pt-3 border-t border-gray-300/30 space-y-2">
        <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
          💡 <b>策略</b>：白天多发电充电池，傍晚/夜间放电应对高峰；
          电力不足时调高住房优先级，保障民生！
        </p>
      </div>
    </div>
  );
}
