import type { LatLngTuple } from './geo';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

const norm360 = (value: number) => ((value % 360) + 360) % 360;
const norm180 = (value: number) => {
  const wrapped = ((value + 180) % 360 + 360) % 360 - 180;
  return wrapped;
};

export interface SubsolarPoint {
  lat: number;
  lng: number;
}

/**
 * 计算太阳直射点（正午点）的经纬度。
 * 低精度天文公式（误差 < 0.02°），用于可视化昼夜分界线足够。
 */
export function subsolarPoint(date: Date): SubsolarPoint {
  const julianDay = date.getTime() / 86400000 + 2440587.5;
  const daysSinceJ2000 = julianDay - 2451545.0;

  // 太阳平黄经与平近点角
  const meanLongitude = norm360(280.46646 + 0.9856474 * daysSinceJ2000);
  const meanAnomaly = norm360(357.528 + 0.9856003 * daysSinceJ2000) * RAD;
  // 黄道经度（含中心差修正）
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.020 * Math.sin(2 * meanAnomaly)) * RAD;
  // 黄赤交角
  const obliquity = (23.439 - 0.0000004 * daysSinceJ2000) * RAD;

  // 赤纬 → 直射点纬度
  const lat = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude)) * DEG;
  // 赤经
  const rightAscension =
    Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude)) * DEG;
  // 格林尼治平恒星时（小时）→ 直射点经度
  const gmstHours = ((18.697374558 + 24.06570982441908 * daysSinceJ2000) % 24 + 24) % 24;

  return { lat, lng: norm180(rightAscension - gmstHours * 15) };
}

/**
 * 构造"夜半球"多边形：沿经度采样晨昏线纬度，再沿极地方向闭合。
 * 返回 Leaflet 需要的 [lat, lng] 数组。
 */
export function nightPolygon(date: Date, step = 2): LatLngTuple[] {
  const { lat: declination, lng: subsolarLng } = subsolarPoint(date);
  // 二分/二分点前后 tan(δ)→0 会让晨昏线退化，这里给一个最小倾角
  const decl = Math.abs(declination) < 0.02 ? (declination >= 0 ? 0.02 : -0.02) : declination;
  const tanDecl = Math.tan(decl * RAD);

  const points: LatLngTuple[] = [];
  for (let lng = -180; lng <= 180; lng += step) {
    const hourAngle = (lng - subsolarLng) * RAD;
    const lat = Math.atan(-Math.cos(hourAngle) / tanDecl) * DEG;
    points.push([lat, lng]);
  }

  // 直射点在北半球时，南极点处于极夜，沿南极闭合
  const darkPole = declination >= 0 ? -90 : 90;
  points.push([darkPole, 180]);
  points.push([darkPole, -180]);
  return points;
}

/** 下一次昼夜分界更新时刻（每分钟刷新一次即可） */
export function nextTerminatorDelayMs(): number {
  return 60_000;
}
