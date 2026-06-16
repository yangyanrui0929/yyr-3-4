import {
  GridCell,
  GRID_SIZE,
  WIRE_CONNECTIONS,
  DIR_OFFSETS,
  BUILDING_STATS,
  DAY_THRESHOLD,
  DAY_LENGTH,
  PHASE_RANGES,
  TimePhase,
  HOUSE_LOAD_PROFILE,
  FACTORY_LOAD_PROFILE,
  LIGHTING_LOAD_PROFILE,
  WINDMILL_GEN_PROFILE,
  LIGHTING_PER_BUILDING,
  FORECAST_STEPS,
  FORECAST_TICK_STEP,
  PriorityLevel,
  WINDMILL_PRIORITY_EFFICIENCY,
  BATTERY_PRIORITY_DEPTH,
} from './constants';

export function isWireConnected(wire: GridCell, direction: number): boolean {
  if (wire.type !== 'wire') return false;
  const connections = WIRE_CONNECTIONS[wire.rotation % 6];
  if (!connections) return false;
  return connections[direction];
}

export function getOppositeDirection(dir: number): number {
  return (dir + 2) % 4;
}

export function getTimePhase(dayTime: number): TimePhase {
  const t = ((dayTime % DAY_LENGTH) + DAY_LENGTH) % DAY_LENGTH;
  for (const range of PHASE_RANGES) {
    const start = range.start % DAY_LENGTH;
    const end = range.end % DAY_LENGTH;
    if (start < end) {
      if (t >= start && t < end) return range.phase;
    } else {
      if (t >= start || t < end) return range.phase;
    }
  }
  return 'day';
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function getPhaseBlendFactors(dayTime: number): Partial<Record<TimePhase, number>> {
  const t = ((dayTime % DAY_LENGTH) + DAY_LENGTH) % DAY_LENGTH;
  const blendWidth = 5;

  const factors: Partial<Record<TimePhase, number>> = {};

  for (const range of PHASE_RANGES) {
    const start = range.start % DAY_LENGTH;
    const end = range.end % DAY_LENGTH;
    let inRange = false;
    let blendT = 0.5;

    if (start < end) {
      if (t >= start - blendWidth && t < end + blendWidth) {
        inRange = true;
        if (t < start + blendWidth) {
          blendT = (t - (start - blendWidth)) / (blendWidth * 2);
        } else if (t >= end - blendWidth) {
          blendT = 1 - (t - (end - blendWidth)) / (blendWidth * 2);
        } else {
          blendT = 1;
        }
      }
    } else {
      if (t >= start - blendWidth || t < end + blendWidth) {
        inRange = true;
        const wrapT = t >= start ? t : t + DAY_LENGTH;
        const wrapStart = start;
        const wrapEnd = end + DAY_LENGTH;
        if (wrapT < wrapStart + blendWidth) {
          blendT = (wrapT - (wrapStart - blendWidth)) / (blendWidth * 2);
        } else if (wrapT >= wrapEnd - blendWidth) {
          blendT = 1 - (wrapT - (wrapEnd - blendWidth)) / (blendWidth * 2);
        } else {
          blendT = 1;
        }
      }
    }

    if (inRange) {
      factors[range.phase] = Math.max(0, Math.min(1, blendT));
    }
  }

  let total = Object.values(factors).reduce((a, b) => a + (b || 0), 0);
  if (total === 0) {
    return { day: 1 };
  }
  if (Math.abs(total - 1) > 0.01) {
    for (const k of Object.keys(factors) as TimePhase[]) {
      factors[k] = (factors[k] || 0) / total;
    }
  }

  return factors;
}

export function getHouseConsumption(dayTime: number, baseConsumption: number): number {
  const factors = getPhaseBlendFactors(dayTime);
  let multiplier = 0;
  for (const [phase, weight] of Object.entries(factors)) {
    multiplier += (HOUSE_LOAD_PROFILE[phase as TimePhase] || 0) * (weight || 0);
  }
  return baseConsumption * multiplier;
}

export function getFactoryConsumption(dayTime: number, baseConsumption: number): number {
  const factors = getPhaseBlendFactors(dayTime);
  let multiplier = 0;
  for (const [phase, weight] of Object.entries(factors)) {
    multiplier += (FACTORY_LOAD_PROFILE[phase as TimePhase] || 0) * (weight || 0);
  }
  return baseConsumption * multiplier;
}

export function getLightingConsumption(
  dayTime: number,
  houseCount: number,
  factoryCount: number
): number {
  const factors = getPhaseBlendFactors(dayTime);
  let multiplier = 0;
  for (const [phase, weight] of Object.entries(factors)) {
    multiplier += (LIGHTING_LOAD_PROFILE[phase as TimePhase] || 0) * (weight || 0);
  }
  const totalBuildings = houseCount + factoryCount;
  return LIGHTING_PER_BUILDING * totalBuildings * multiplier;
}

export function getWindmillGeneration(
  dayTime: number,
  baseDayGen: number,
  baseNightGen: number
): number {
  const factors = getPhaseBlendFactors(dayTime);
  let multiplier = 0;
  for (const [phase, weight] of Object.entries(factors)) {
    const profile = WINDMILL_GEN_PROFILE[phase as TimePhase];
    if (profile) {
      const phaseMult = lerp(profile.min, profile.max, 0.5);
      multiplier += phaseMult * (weight || 0);
    }
  }
  const isDay = dayTime < DAY_THRESHOLD;
  const base = isDay ? baseDayGen : baseNightGen;
  if (multiplier === 0) return base;
  if (isDay) {
    return baseDayGen * multiplier;
  } else {
    return baseDayGen * multiplier + baseNightGen * (1 - multiplier / 0.2) * 0;
  }
}

export function getBuildingPriority(
  type: GridCell['type'],
  overrides: Partial<Record<GridCell['type'], PriorityLevel>>
): PriorityLevel {
  if (overrides[type]) return overrides[type]!;
  const stats = BUILDING_STATS[type];
  if (!stats) return 1;
  return (stats as { defaultPriority: PriorityLevel }).defaultPriority;
}

interface ConnectedCell {
  x: number;
  y: number;
  type: GridCell['type'];
  consumption: number;
  priority: PriorityLevel;
}

export function calculatePowerNetwork(
  grid: GridCell[][],
  dayTime: number,
  storedPower: number,
  priorityOverrides: Partial<Record<GridCell['type'], PriorityLevel>> = {}
): {
  poweredCells: Set<string>;
  totalGeneration: number;
  totalDemand: number;
  totalConsumption: number;
  batteryCapacity: number;
  houseDemand: number;
  factoryDemand: number;
  lightingDemand: number;
  houseConsumption: number;
  factoryConsumption: number;
  lightingConsumption: number;
  breakdownByPriority: Record<PriorityLevel, { consumption: number; powered: number; demand: number }>;
} {
  let totalGeneration = 0;
  let batteryCapacity = 0;
  let houseCount = 0;
  let factoryCount = 0;

  const windmillSources: Array<{ x: number; y: number; gen: number }> = [];
  const batterySources: Array<{ x: number; y: number; discharge: number }> = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (cell.faulty) continue;

      if (cell.type === 'windmill') {
        const baseGen = getWindmillGeneration(
          dayTime,
          BUILDING_STATS.windmill.dayGen,
          BUILDING_STATS.windmill.nightGen
        );
        const efficiency = WINDMILL_PRIORITY_EFFICIENCY[getBuildingPriority('windmill', priorityOverrides)];
        const gen = baseGen * efficiency;
        totalGeneration += gen;
        windmillSources.push({ x, y, gen });
      }
      if (cell.type === 'battery') {
        batteryCapacity += BUILDING_STATS.battery.storage;
      }
      if (cell.type === 'house') {
        houseCount++;
      }
      if (cell.type === 'factory') {
        factoryCount++;
      }
    }
  }

  const houseDemand = houseCount * getHouseConsumption(dayTime, BUILDING_STATS.house.consumption);
  const factoryDemand =
    factoryCount * getFactoryConsumption(dayTime, BUILDING_STATS.factory.consumption);
  const lightingDemand = getLightingConsumption(dayTime, houseCount, factoryCount);
  const totalDemand = houseDemand + factoryDemand + lightingDemand;

  const batteryDepth = BATTERY_PRIORITY_DEPTH[getBuildingPriority('battery', priorityOverrides)];
  const minReserve = batteryCapacity * (1 - batteryDepth);
  const availableFromBatteries = Math.max(0, storedPower - minReserve);
  const totalAvailable = totalGeneration + availableFromBatteries;

  if (availableFromBatteries > 0) {
    const batteryCount = grid.flat().filter((c) => c.type === 'battery' && !c.faulty).length;
    if (batteryCount > 0) {
      const dischargePerBattery = availableFromBatteries / batteryCount;
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = grid[y][x];
          if (cell.type === 'battery' && !cell.faulty) {
            batterySources.push({ x, y, discharge: dischargePerBattery });
          }
        }
      }
    }
  }

  const allSources = [
    ...windmillSources.map((s) => ({ x: s.x, y: s.y })),
    ...batterySources.map((s) => ({ x: s.x, y: s.y })),
  ];

  const connectedCells = new Set<string>();
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [...allSources];

  for (const s of allSources) {
    visited.add(`${s.x},${s.y}`);
    connectedCells.add(`${s.x},${s.y}`);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentCell = grid[current.y][current.x];

    for (let dir = 0; dir < 4; dir++) {
      const [dx, dy] = DIR_OFFSETS[dir];
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;

      const neighbor = grid[ny][nx];
      if (neighbor.faulty) continue;

      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;

      let canConnectFromCurrent = false;
      if (currentCell.type === 'wire') {
        canConnectFromCurrent = isWireConnected(currentCell, dir);
      } else if (
        currentCell.type === 'windmill' ||
        currentCell.type === 'house' ||
        currentCell.type === 'factory' ||
        currentCell.type === 'battery'
      ) {
        canConnectFromCurrent = neighbor.type === 'wire';
      }

      let canConnectFromNeighbor = false;
      if (neighbor.type === 'wire') {
        canConnectFromNeighbor = isWireConnected(neighbor, getOppositeDirection(dir));
      } else if (
        neighbor.type === 'windmill' ||
        neighbor.type === 'house' ||
        neighbor.type === 'factory' ||
        neighbor.type === 'battery'
      ) {
        canConnectFromNeighbor = currentCell.type === 'wire';
      }

      if (canConnectFromCurrent && canConnectFromNeighbor) {
        visited.add(key);
        connectedCells.add(key);
        if (neighbor.type === 'wire') {
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  const poweredCells = new Set<string>();

  for (const s of allSources) {
    poweredCells.add(`${s.x},${s.y}`);
  }

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (cell.type === 'wire' && connectedCells.has(`${x},${y}`)) {
        poweredCells.add(`${x},${y}`);
      }
    }
  }

  const connectedConsumers: ConnectedCell[] = [];
  let connectedHouseCount = 0;
  let connectedFactoryCount = 0;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (!connectedCells.has(`${x},${y}`)) continue;

      if (cell.type === 'house') {
        connectedHouseCount++;
        const cons = getHouseConsumption(dayTime, BUILDING_STATS.house.consumption);
        connectedConsumers.push({
          x,
          y,
          type: 'house',
          consumption: cons,
          priority: getBuildingPriority('house', priorityOverrides),
        });
      }
      if (cell.type === 'factory') {
        connectedFactoryCount++;
        const cons = getFactoryConsumption(dayTime, BUILDING_STATS.factory.consumption);
        connectedConsumers.push({
          x,
          y,
          type: 'factory',
          consumption: cons,
          priority: getBuildingPriority('factory', priorityOverrides),
        });
      }
    }
  }

  const connectedLightingConsumption = getLightingConsumption(
    dayTime,
    connectedHouseCount,
    connectedFactoryCount
  );

  let remainingPower = totalAvailable;

  const breakdownByPriority: Record<
    PriorityLevel,
    { consumption: number; powered: number; demand: number }
  > = {
    1: { consumption: 0, powered: 0, demand: 0 },
    2: { consumption: 0, powered: 0, demand: 0 },
    3: { consumption: 0, powered: 0, demand: 0 },
  };

  for (const consumer of connectedConsumers) {
    breakdownByPriority[consumer.priority].demand += consumer.consumption;
    breakdownByPriority[consumer.priority].consumption += consumer.consumption;
  }
  breakdownByPriority[2].demand += connectedLightingConsumption;
  breakdownByPriority[2].consumption += connectedLightingConsumption;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (!connectedCells.has(`${x},${y}`) || cell.faulty) continue;
      if (cell.type === 'windmill' || cell.type === 'battery') {
        const priority = getBuildingPriority(cell.type, priorityOverrides);
        const nominal = 0.01;
        breakdownByPriority[priority].demand += nominal;
        breakdownByPriority[priority].consumption += nominal;
        breakdownByPriority[priority].powered += nominal;
      }
    }
  }

  let actualHouseConsumption = 0;
  let actualFactoryConsumption = 0;
  let actualLightingConsumption = 0;

  for (let p = 1; p <= 3; p++) {
    const priority = p as PriorityLevel;
    const consumersThisPriority = connectedConsumers.filter((c) => c.priority === priority);

    for (const consumer of consumersThisPriority) {
      if (remainingPower >= consumer.consumption) {
        remainingPower -= consumer.consumption;
        poweredCells.add(`${consumer.x},${consumer.y}`);
        breakdownByPriority[priority].powered += consumer.consumption;
        if (consumer.type === 'house') {
          actualHouseConsumption += consumer.consumption;
        } else if (consumer.type === 'factory') {
          actualFactoryConsumption += consumer.consumption;
        }
      }
    }

    if (priority === 2) {
      if (remainingPower >= connectedLightingConsumption) {
        remainingPower -= connectedLightingConsumption;
        breakdownByPriority[priority].powered += connectedLightingConsumption;
        actualLightingConsumption += connectedLightingConsumption;
      } else {
        breakdownByPriority[priority].powered += remainingPower;
        actualLightingConsumption += remainingPower;
        remainingPower = 0;
      }
    }
  }

  const totalConsumption = actualHouseConsumption + actualFactoryConsumption + actualLightingConsumption;

  return {
    poweredCells,
    totalGeneration,
    totalDemand,
    totalConsumption,
    batteryCapacity,
    houseDemand,
    factoryDemand,
    lightingDemand,
    houseConsumption: actualHouseConsumption,
    factoryConsumption: actualFactoryConsumption,
    lightingConsumption: actualLightingConsumption,
    breakdownByPriority,
  };
}

export function countPoweredBuildings(
  grid: GridCell[][],
  poweredCells: Set<string>
): { houses: number; poweredHouses: number; factories: number; poweredFactories: number } {
  let houses = 0;
  let poweredHouses = 0;
  let factories = 0;
  let poweredFactories = 0;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (cell.type === 'house') {
        houses++;
        if (poweredCells.has(`${x},${y}`)) poweredHouses++;
      }
      if (cell.type === 'factory') {
        factories++;
        if (poweredCells.has(`${x},${y}`)) poweredFactories++;
      }
    }
  }

  return { houses, poweredHouses, factories, poweredFactories };
}

export interface ForecastPoint {
  time: number;
  phase: TimePhase;
  generation: number;
  consumption: number;
  houseLoad: number;
  factoryLoad: number;
  lightingLoad: number;
  netPower: number;
  projectedStorage: number;
}

export function generatePowerForecast(
  grid: GridCell[][],
  currentDayTime: number,
  currentStoredPower: number,
  batteryCapacity: number,
  priorityOverrides: Partial<Record<GridCell['type'], PriorityLevel>> = {}
): ForecastPoint[] {
  const forecast: ForecastPoint[] = [];

  let windmillCount = 0;
  let houseCount = 0;
  let factoryCount = 0;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (cell.faulty) continue;
      if (cell.type === 'windmill') windmillCount++;
      if (cell.type === 'house') houseCount++;
      if (cell.type === 'factory') factoryCount++;
    }
  }

  const housePriority = getBuildingPriority('house', priorityOverrides);
  const factoryPriority = getBuildingPriority('factory', priorityOverrides);
  const lightingPriority = 2 as PriorityLevel;
  const windmillEfficiency = WINDMILL_PRIORITY_EFFICIENCY[getBuildingPriority('windmill', priorityOverrides)];
  const batteryDepth = BATTERY_PRIORITY_DEPTH[getBuildingPriority('battery', priorityOverrides)];

  let projectedStorage = currentStoredPower;

  for (let i = 0; i <= FORECAST_STEPS; i++) {
    const forecastTime = ((currentDayTime + i * FORECAST_TICK_STEP) % DAY_LENGTH + DAY_LENGTH) % DAY_LENGTH;
    const phase = getTimePhase(forecastTime);

    const baseGen = windmillCount * getWindmillGeneration(forecastTime, 5, 1) * windmillEfficiency;
    const houseDemand = houseCount * getHouseConsumption(forecastTime, BUILDING_STATS.house.consumption);
    const factoryDemand =
      factoryCount * getFactoryConsumption(forecastTime, BUILDING_STATS.factory.consumption);
    const lightingDemand = getLightingConsumption(forecastTime, houseCount, factoryCount);
    const totalDemand = houseDemand + factoryDemand + lightingDemand;

    const minReserve = batteryCapacity * (1 - batteryDepth);
    const batteryDischargeAvail = Math.max(0, projectedStorage - minReserve);
    const totalAvailPower = baseGen + batteryDischargeAvail;

    const demandsByPriority: Array<{ priority: PriorityLevel; demand: number; type: string }> = [
      { priority: housePriority, demand: houseDemand, type: 'house' },
      { priority: factoryPriority, demand: factoryDemand, type: 'factory' },
      { priority: lightingPriority, demand: lightingDemand, type: 'lighting' },
    ];

    demandsByPriority.sort((a, b) => Number(a.priority) - Number(b.priority));

    let remaining = totalAvailPower;
    let actualHouse = 0;
    let actualFactory = 0;
    let actualLighting = 0;

    for (const d of demandsByPriority) {
      if (remaining >= d.demand) {
        remaining -= d.demand;
        if (d.type === 'house') actualHouse = d.demand;
        else if (d.type === 'factory') actualFactory = d.demand;
        else if (d.type === 'lighting') actualLighting = d.demand;
      } else {
        const ratio = remaining / Math.max(d.demand, 0.001);
        if (d.type === 'house') actualHouse = d.demand * ratio;
        else if (d.type === 'factory') actualFactory = d.demand * ratio;
        else if (d.type === 'lighting') actualLighting = d.demand * ratio;
        remaining = 0;
      }
    }

    const actualConsumption = actualHouse + actualFactory + actualLighting;
    const netPower = baseGen - actualConsumption;

    if (netPower > 0) {
      projectedStorage = Math.min(batteryCapacity, projectedStorage + netPower * 0.3);
    } else if (netPower < 0) {
      const deficit = -netPower;
      const maxDischarge = Math.max(0, projectedStorage - minReserve);
      const discharge = Math.min(maxDischarge, deficit * 0.5);
      projectedStorage = Math.max(minReserve, projectedStorage - discharge);
    }

    forecast.push({
      time: forecastTime,
      phase,
      generation: Math.round(baseGen * 10) / 10,
      consumption: Math.round(actualConsumption * 10) / 10,
      houseLoad: Math.round(actualHouse * 10) / 10,
      factoryLoad: Math.round(actualFactory * 10) / 10,
      lightingLoad: Math.round(actualLighting * 10) / 10,
      netPower: Math.round(netPower * 10) / 10,
      projectedStorage: Math.round(projectedStorage * 10) / 10,
    });
  }

  return forecast;
}
