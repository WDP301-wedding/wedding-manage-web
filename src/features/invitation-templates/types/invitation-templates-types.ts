import type { operations } from '@/src/lib/api/generated/schema';

export type InvitationTemplateItem =
  operations['listManagedInvitationTemplates']['responses'][200]['content']['application/json']['data']['items'][number];

export type CardThemeId =
  | 'royal-burgundy'
  | 'sage-minimalist'
  | 'blush-floral'
  | 'traditional-red'
  | 'celestial-navy'
  | 'champagne-luxury';

export type CardLayoutId = 'envelope' | 'gatefold' | 'album';

export type CardMotifId =
  | 'peony'
  | 'lotus'
  | 'botanical'
  | 'art-deco'
  | 'celestial'
  | 'orchid'
  | 'cloud'
  | 'ginkgo'
  | 'phoenix'
  | 'magnolia'
  | 'bamboo'
  | 'song-hy'
  | 'lace'
  | 'wildflower';

export type CardFinishId =
  | 'letterpress'
  | 'gold-foil'
  | 'silk'
  | 'embossed-cotton'
  | 'pearl'
  | 'linen';

export type CardFrameId = 'double-line' | 'arch' | 'corners' | 'scalloped' | 'inset';

export interface TemplateDraftForm {
  title: string;
  theme: CardThemeId;
  layout: CardLayoutId;
  finish: CardFinishId;
  frame: CardFrameId;
  coverMotif: CardMotifId;
  insideMotif: CardMotifId;
  greeting: string;
  message: string;
  footer: string;
  includesSeating: boolean;
  active: boolean;
}

export const THEME_OPTIONS: readonly {
  id: CardThemeId;
  label: string;
  palette: readonly string[];
  description: string;
}[] = [
  {
    id: 'royal-burgundy',
    label: 'Hoàng Gia (Royal Burgundy)',
    palette: ['#7A1F3D', '#C9A46A', '#FFFDF9', '#4A1224'],
    description: 'Tone đỏ rượu vang quý phái kết hợp hoa văn chỉ vàng kim hoàng gia.',
  },
  {
    id: 'sage-minimalist',
    label: 'Hiện Đại (Sage Minimalist)',
    palette: ['#556B5D', '#A38368', '#F7F7F4', '#2C3E35'],
    description: 'Tone xanh xô thơm pastel thanh lịch, đường nét tinh giản mộc mạc.',
  },
  {
    id: 'traditional-red',
    label: 'Song Hỷ Truyền Thống',
    palette: ['#8B2025', '#A97732', '#FFF6EB', '#44191C'],
    description: 'Chữ hỷ nổi bật trên nền đỏ son truyền thống và vân mây ép kim.',
  },
  {
    id: 'blush-floral',
    label: 'Hoa Hồng Phấn (Blush Floral)',
    palette: ['#C47A83', '#B8977E', '#FFF8F8', '#633B42'],
    description: 'Tone hồng pastel nhẹ nhàng lãng mạn kết hợp hoa mẫu đơn.',
  },
  {
    id: 'celestial-navy',
    label: 'Đêm Sao (Celestial Navy)',
    palette: ['#243252', '#7D6C42', '#F8FAFF', '#1B2438'],
    description: 'Huy hiệu trăng sao và khung vòm trên nền xanh đêm huyền bí.',
  },
  {
    id: 'champagne-luxury',
    label: 'Ren Giấy Cotton (Champagne)',
    palette: ['#5B4831', '#927342', '#FFFCF5', '#3E2F1D'],
    description: 'Ren viền mềm và vân giấy cotton cao cấp dập nổi.',
  },
] as const;

export const LAYOUT_OPTIONS: readonly {
  id: CardLayoutId;
  label: string;
  description: string;
}[] = [
  {
    id: 'envelope',
    label: 'Phong bì truyền thống (Envelope)',
    description: 'Thiệp nắp gấp dạng phong bì trang nhã, mở theo chiều dọc.',
  },
  {
    id: 'gatefold',
    label: 'Cánh bướm đôi (Gatefold)',
    description: 'Mở hai cánh sang hai bên như cửa cung điện, trang trọng.',
  },
  {
    id: 'album',
    label: 'Cuốn sổ kỷ niệm (Album)',
    description: 'Lật từng trang như một album ảnh cưới mini hiện đại.',
  },
] as const;

export const FINISH_OPTIONS: readonly { id: CardFinishId; label: string }[] = [
  { id: 'gold-foil', label: 'Ép kim ánh vàng (Gold Foil)' },
  { id: 'embossed-cotton', label: 'Dập nổi trên giấy cotton' },
  { id: 'silk', label: 'Cán lụa mờ cao cấp (Silk)' },
  { id: 'letterpress', label: 'Khắc chìm thủ công (Letterpress)' },
  { id: 'pearl', label: 'Phủ ánh ngọc trai (Pearl)' },
  { id: 'linen', label: 'Gân vải lanh tự nhiên (Linen)' },
] as const;

export const FRAME_OPTIONS: readonly { id: CardFrameId; label: string }[] = [
  { id: 'inset', label: 'Viền chìm tinh tế (Inset)' },
  { id: 'double-line', label: 'Chỉ đôi cổ điển (Double Line)' },
  { id: 'arch', label: 'Khung vòm cung điện (Arch)' },
  { id: 'scalloped', label: 'Viền lượn sóng ren (Scalloped)' },
  { id: 'corners', label: 'Góc hoa văn đối xứng (Corners)' },
] as const;

export const MOTIF_OPTIONS: readonly { id: CardMotifId; label: string }[] = [
  { id: 'song-hy', label: 'Chữ Song Hỷ (囍)' },
  { id: 'phoenix', label: 'Chim Phượng hoàng' },
  { id: 'lotus', label: 'Hoa Sen' },
  { id: 'peony', label: 'Hoa Mẫu đơn' },
  { id: 'orchid', label: 'Hoa Lan' },
  { id: 'magnolia', label: 'Hoa Mộc lan' },
  { id: 'bamboo', label: 'Họa tiết Trúc' },
  { id: 'cloud', label: 'Vân mây may mắn' },
  { id: 'ginkgo', label: 'Lá Ngân hạnh' },
  { id: 'celestial', label: 'Trăng sao thiên hà' },
  { id: 'art-deco', label: 'Hình học Art Deco' },
  { id: 'lace', label: 'Ren hoa văn mềm' },
  { id: 'botanical', label: 'Dây lá tự nhiên' },
  { id: 'wildflower', label: 'Hoa cỏ dại' },
] as const;
