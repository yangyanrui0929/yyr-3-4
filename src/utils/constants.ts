export type CellType = 'empty' | 'windmill' | 'house' | 'factory' | 'battery' | 'wire';

export type ToolType = CellType | 'remove';

export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night';

export type PriorityLevel = 1 | 2 | 3;

export interface GridCell {
  x: number;
  y: number;
  type: CellType;
  rotation: number;
  powered: boolean;
  faulty: boolean;
}

export const GRID_SIZE = 8;

export const BUILDING_STATS = {
  windmill: {
    dayGen: 5,
    nightGen: 1,
    consumption: 0,
    baseLoad: 0,
    peakLoad: 0,
    name: '风车',
    emoji: '🌀',
    defaultPriority: 1 as PriorityLevel,
  },
  house: {
    dayGen: 0,
    nightGen: 0,
    consumption: 2,
    baseLoad: 0.5,
    peakLoad: 4,
    name: '住房',
    emoji: '🏠',
    defaultPriority: 2 as PriorityLevel,
  },
  factory: {
    dayGen: 0,
    nightGen: 0,
    consumption: 4,
    baseLoad: 0.5,
    peakLoad: 6,
    name: '工坊',
    emoji: '🏭',
    defaultPriority: 3 as PriorityLevel,
  },
  battery: {
    dayGen: 0,
    nightGen: 0,
    consumption: 0,
    baseLoad: 0,
    peakLoad: 0,
    storage: 20,
    name: '蓄电池',
    emoji: '🔋',
    defaultPriority: 1 as PriorityLevel,
  },
  wire: {
    dayGen: 0,
    nightGen: 0,
    consumption: 0,
    baseLoad: 0,
    peakLoad: 0,
    name: '电线',
    emoji: '⚡',
    defaultPriority: 1 as PriorityLevel,
  },
} as const;

export const TIME_PHASES: Record<TimePhase, { name: string; emoji: string; color: string }> = {
  dawn: { name: '清晨', emoji: '🌅', color: '#F59E0B' },
  day: { name: '白天', emoji: '☀️', color: '#FBBF24' },
  dusk: { name: '傍晚', emoji: '🌇', color: '#F97316' },
  night: { name: '深夜', emoji: '🌙', color: '#6366F1' },
};

export const PHASE_RANGES: Array<{ phase: TimePhase; start: number; end: number }> = [
  { phase: 'dawn', start: 10, end: 25 },
  { phase: 'day', start: 25, end: 65 },
  { phase: 'dusk', start: 65, end: 80 },
  { phase: 'night', start: 80, end: 110 },
];

export const HOUSE_LOAD_PROFILE: Record<TimePhase, number> = {
  dawn: 1.8,
  day: 0.8,
  dusk: 1.5,
  night: 0.3,
};

export const FACTORY_LOAD_PROFILE: Record<TimePhase, number> = {
  dawn: 0.5,
  day: 1.5,
  dusk: 1.0,
  night: 0.2,
};

export const LIGHTING_LOAD_PROFILE: Record<TimePhase, number> = {
  dawn: 0.3,
  day: 0.0,
  dusk: 1.2,
  night: 0.5,
};

export const WINDMILL_GEN_PROFILE: Record<TimePhase, { min: number; max: number }> = {
  dawn: { min: 0.6, max: 0.9 },
  day: { min: 1.0, max: 1.0 },
  dusk: { min: 0.5, max: 0.8 },
  night: { min: 0.2, max: 0.2 },
};

export const PRIORITY_INFO: Record<PriorityLevel, { name: string; color: string; description: string }> = {
  1: { name: '最高优先级', color: '#10B981', description: '基础保障：蓄电池、风车、关键设施' },
  2: { name: '中优先级', color: '#FBBF24', description: '民生需求：住房照明、生活用电' },
  3: { name: '低优先级', color: '#F87171', description: '生产负荷：工坊生产，可被限电' },
};

export const WINDMILL_PRIORITY_EFFICIENCY: Record<PriorityLevel, number> = {
  1: 1.0,
  2: 0.85,
  3: 0.65,
};

export const BATTERY_PRIORITY_DEPTH: Record<PriorityLevel, number> = {
  1: 1.0,
  2: 0.75,
  3: 0.45,
};

export const LIGHTING_PER_BUILDING = 0.8;

export const WIRE_CONNECTIONS: Record<number, [boolean, boolean, boolean, boolean]> = {
  0: [true, false, true, false],
  1: [false, true, false, true],
  2: [true, true, false, false],
  3: [true, false, false, true],
  4: [false, true, true, false],
  5: [false, false, true, true],
};

export const DIR_OFFSETS: Array<[number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export const TOOLS: Array<{ type: ToolType; name: string; emoji: string; description: string }> = [
  { type: 'windmill', name: '风车', emoji: '🌀', description: '白天发5电，傍晚0.8倍，深夜发1电' },
  { type: 'house', name: '住房', emoji: '🏠', description: '清晨/傍晚高耗电，深夜基础负载' },
  { type: 'factory', name: '工坊', emoji: '🏭', description: '白天满负荷，深夜轻负载' },
  { type: 'battery', name: '蓄电池', emoji: '🔋', description: '存储20电量，应对高峰' },
  { type: 'wire', name: '电线', emoji: '⚡', description: '传导电力，右键/R旋转' },
  { type: 'remove', name: '拆除', emoji: '🗑️', description: '移除建筑或电线' },
];

export const DAY_LENGTH = 100;
export const DAY_THRESHOLD = 50;
export const TICK_INTERVAL = 300;
export const FAULT_CHANCE = 0.002;

export const FORECAST_STEPS = 40;
export const FORECAST_TICK_STEP = 2.5;
