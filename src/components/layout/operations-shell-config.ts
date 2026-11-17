export type CockpitViewKey = 'floorplan' | 'rundown' | 'bookings' | 'settlement' | 'menu';

export const COCKPIT_VIEW_TITLES: Record<CockpitViewKey, string> = {
  floorplan: 'Sơ Đồ Bàn',
  rundown: 'Kịch Bản Lễ & Ra Món',
  bookings: 'Sổ Đặt Tiệc',
  settlement: 'Quyết Toán & QR',
  menu: 'Thực Đơn',
};

export const iconButtonClass =
  'flex size-10 items-center justify-center rounded-md text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
