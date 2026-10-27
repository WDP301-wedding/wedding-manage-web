import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BACKEND_URL = process.env.BACKEND_ORIGIN || 'https://wedding-be-render-trial.onrender.com';
const CATALOG_DIR = process.env.CATALOG_DIR || 'c:\\Users\\phanp\\Downloads\\tai-len-catalog';

const email = process.argv[2] || process.env.MANAGER_EMAIL;
const password = process.argv[3] || process.env.MANAGER_PASSWORD;

if (!email || !password) {
  console.error('❌ Cách sử dụng: node scripts/upload-catalog-media.mjs <email> <password>');
  process.exit(1);
}

async function login(email, password) {
  console.log(`🔑 Đang đăng nhập tài khoản: ${email}...`);
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/web-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.data?.accessToken) {
    console.error('❌ Đăng nhập thất bại:', JSON.stringify(data));
    process.exit(1);
  }
  console.log('✅ Đăng nhập thành công!');
  return data.data.accessToken;
}

async function getCatalogInfo() {
  console.log('📦 Đang tải danh sách sảnh, thực đơn, món ăn từ máy chủ...');
  const [hallsRes, menusRes, dishesRes] = await Promise.all([
    fetch(`${BACKEND_URL}/api/v1/catalog/halls`).then((r) => r.json()),
    fetch(`${BACKEND_URL}/api/v1/catalog/menu-packages`).then((r) => r.json()),
    fetch(`${BACKEND_URL}/api/v1/catalog/dishes`).then((r) => r.json()),
  ]);

  const halls = hallsRes.data?.items ?? [];
  const menus = menusRes.data?.items ?? [];
  const dishes = dishesRes.data?.items ?? [];

  const lotusHall = halls.find((h) => h.name.toLowerCase().includes('lotus'));
  const orchidHall = halls.find((h) => h.name.toLowerCase().includes('orchid'));
  const classicMenu = menus.find((m) => m.name.toLowerCase().includes('classic'));
  const premiumMenu = menus.find((m) => m.name.toLowerCase().includes('premium'));
  const lotusSalad = dishes.find((d) => d.name.toLowerCase().includes('lotus salad'));
  const roastedChicken = dishes.find((d) => d.name.toLowerCase().includes('roasted chicken'));
  const pannaCotta = dishes.find((d) => d.name.toLowerCase().includes('panna cotta'));

  if (
    !lotusHall ||
    !orchidHall ||
    !classicMenu ||
    !premiumMenu ||
    !lotusSalad ||
    !roastedChicken ||
    !pannaCotta
  ) {
    console.error('❌ Không tìm thấy đầy đủ các mục catalog tương ứng trên backend:', {
      lotusHall: !!lotusHall,
      orchidHall: !!orchidHall,
      classicMenu: !!classicMenu,
      premiumMenu: !!premiumMenu,
      lotusSalad: !!lotusSalad,
      roastedChicken: !!roastedChicken,
      pannaCotta: !!pannaCotta,
    });
    process.exit(1);
  }

  return {
    lotusHall,
    orchidHall,
    classicMenu,
    premiumMenu,
    lotusSalad,
    roastedChicken,
    pannaCotta,
  };
}

async function uploadAsset(token, { resourceType, resourceId, filePath, alternativeText, label }) {
  console.log(`📤 Đang tải lên: ${label}...`);
  const fileBytes = readFileSync(filePath);
  const blob = new Blob([fileBytes], { type: 'image/webp' });
  const filename = filePath.split(/[/\\]/).pop();

  const formData = new FormData();
  formData.set('assetId', crypto.randomUUID());
  formData.set('resourceType', resourceType);
  formData.set('resourceId', resourceId);
  formData.set('alternativeText', alternativeText);
  formData.set('file', blob, filename);

  const res = await fetch(`${BACKEND_URL}/api/v1/management/catalog/media-assets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ Thất bại khi tải ${label}: ${res.status} - ${errorText}`);
    return false;
  }
  console.log(`   ✓ Hoàn tất: ${label}`);
  return true;
}

async function main() {
  const token = await login(email, password);
  const info = await getCatalogInfo();

  const itemsToUpload = [
    // Lotus Hall
    {
      resourceType: 'HALL',
      resourceId: info.lotusHall.id,
      filePath: join(CATALOG_DIR, 'halls', 'lotus-hall', 'lotus-hall-01.webp'),
      alternativeText:
        'Toàn cảnh Lotus Hall với đèn chùm pha lê, bàn tiệc phủ khăn kem và sân khấu hoa trắng',
      label: 'Lotus Hall [1/6 - Ảnh bìa]',
    },
    {
      resourceType: 'HALL',
      resourceId: info.lotusHall.id,
      filePath: join(CATALOG_DIR, 'halls', 'lotus-hall', 'lotus-hall-05.webp'),
      alternativeText: 'Lotus Hall nhìn từ cuối sảnh, dãy bàn dài trang trí hoa sen hồng',
      label: 'Lotus Hall [2/6]',
    },
    {
      resourceType: 'HALL',
      resourceId: info.lotusHall.id,
      filePath: join(CATALOG_DIR, 'halls', 'lotus-hall', 'lotus-hall-02.webp'),
      alternativeText: 'Sân khấu Lotus Hall với cổng hoa trắng và rèm voan kem',
      label: 'Lotus Hall [3/6]',
    },
    {
      resourceType: 'HALL',
      resourceId: info.lotusHall.id,
      filePath: join(CATALOG_DIR, 'halls', 'lotus-hall', 'lotus-hall-03.webp'),
      alternativeText: 'Bàn tiệc dài Lotus Hall bày bình hoa sen hồng và nến',
      label: 'Lotus Hall [4/6]',
    },
    {
      resourceType: 'HALL',
      resourceId: info.lotusHall.id,
      filePath: join(CATALOG_DIR, 'halls', 'lotus-hall', 'lotus-hall-06.webp'),
      alternativeText: 'Cận cảnh bình hoa sen hồng trên bàn tiệc Lotus Hall',
      label: 'Lotus Hall [5/6]',
    },
    {
      resourceType: 'HALL',
      resourceId: info.lotusHall.id,
      filePath: join(CATALOG_DIR, 'halls', 'lotus-hall', 'lotus-hall-04.webp'),
      alternativeText: 'Lối vào Lotus Hall với bàn đón khách và cửa kính vàng đồng',
      label: 'Lotus Hall [6/6]',
    },

    // Orchid Hall
    {
      resourceType: 'HALL',
      resourceId: info.orchidHall.id,
      filePath: join(CATALOG_DIR, 'halls', 'orchid-hall', 'orchid-hall-01.webp'),
      alternativeText: 'Toàn cảnh Orchid Hall với bàn tròn, đèn chùm pha lê và tông kem champagne',
      label: 'Orchid Hall [1/6 - Ảnh bìa]',
    },
    {
      resourceType: 'HALL',
      resourceId: info.orchidHall.id,
      filePath: join(CATALOG_DIR, 'halls', 'orchid-hall', 'orchid-hall-05.webp'),
      alternativeText: 'Orchid Hall nhìn từ giữa sảnh, các bàn tròn thắp nến',
      label: 'Orchid Hall [2/6]',
    },
    {
      resourceType: 'HALL',
      resourceId: info.orchidHall.id,
      filePath: join(CATALOG_DIR, 'halls', 'orchid-hall', 'orchid-hall-02.webp'),
      alternativeText: 'Sân khấu Orchid Hall với cụm lan trắng và bàn bánh cưới',
      label: 'Orchid Hall [3/6]',
    },
    {
      resourceType: 'HALL',
      resourceId: info.orchidHall.id,
      filePath: join(CATALOG_DIR, 'halls', 'orchid-hall', 'orchid-hall-03.webp'),
      alternativeText: 'Bàn tròn Orchid Hall bày lan trắng, ly pha lê và nến',
      label: 'Orchid Hall [4/6]',
    },
    {
      resourceType: 'HALL',
      resourceId: info.orchidHall.id,
      filePath: join(CATALOG_DIR, 'halls', 'orchid-hall', 'orchid-hall-06.webp'),
      alternativeText: 'Cận cảnh chậu lan trắng trên bàn tiệc Orchid Hall',
      label: 'Orchid Hall [5/6]',
    },
    {
      resourceType: 'HALL',
      resourceId: info.orchidHall.id,
      filePath: join(CATALOG_DIR, 'halls', 'orchid-hall', 'orchid-hall-04.webp'),
      alternativeText: 'Sảnh đón khách Orchid Hall với bàn ký tên và lan trắng',
      label: 'Orchid Hall [6/6]',
    },

    // Menus (Menu Package Versions)
    {
      resourceType: 'MENU_PACKAGE_VERSION',
      resourceId: info.classicMenu.versionId,
      filePath: join(CATALOG_DIR, 'menus', 'classic-celebration', 'classic-celebration-cover.webp'),
      alternativeText: 'Gỏi ngó sen và gà quay bày trên bàn tiệc cưới',
      label: 'Thực đơn Classic Celebration [Ảnh bìa]',
    },
    {
      resourceType: 'MENU_PACKAGE_VERSION',
      resourceId: info.premiumMenu.versionId,
      filePath: join(CATALOG_DIR, 'menus', 'premium-celebration', 'premium-celebration-cover.webp'),
      alternativeText: 'Gỏi ngó sen, gà quay và panna cotta dừa bày trên bàn tiệc cưới',
      label: 'Thực đơn Premium Celebration [Ảnh bìa]',
    },

    // Dishes (Dish Versions)
    {
      resourceType: 'DISH_VERSION',
      resourceId: info.lotusSalad.versionId,
      filePath: join(CATALOG_DIR, 'menus', 'classic-celebration', 'mon-goi-ngo-sen-01.webp'),
      alternativeText: 'Đĩa gỏi ngó sen tôm thịt rắc hành phi và đậu phộng',
      label: 'Món Gỏi ngó sen [1/2]',
    },
    {
      resourceType: 'DISH_VERSION',
      resourceId: info.lotusSalad.versionId,
      filePath: join(CATALOG_DIR, 'menus', 'classic-celebration', 'mon-goi-ngo-sen-02.webp'),
      alternativeText: 'Cận cảnh gỏi ngó sen với tôm và rau thơm',
      label: 'Món Gỏi ngó sen [2/2]',
    },
    {
      resourceType: 'DISH_VERSION',
      resourceId: info.roastedChicken.versionId,
      filePath: join(CATALOG_DIR, 'menus', 'classic-celebration', 'mon-ga-quay-01.webp'),
      alternativeText: 'Đĩa gà quay da vàng giòn chặt miếng, trang trí ngò',
      label: 'Món Gà quay [1/2]',
    },
    {
      resourceType: 'DISH_VERSION',
      resourceId: info.roastedChicken.versionId,
      filePath: join(CATALOG_DIR, 'menus', 'classic-celebration', 'mon-ga-quay-02.webp'),
      alternativeText: 'Cận cảnh gà quay vàng óng kèm chanh',
      label: 'Món Gà quay [2/2]',
    },
    {
      resourceType: 'DISH_VERSION',
      resourceId: info.pannaCotta.versionId,
      filePath: join(CATALOG_DIR, 'menus', 'premium-celebration', 'mon-panna-cotta-dua-01.webp'),
      alternativeText: 'Ly panna cotta dừa phủ dừa nướng',
      label: 'Món Panna cotta dừa [1/2]',
    },
    {
      resourceType: 'DISH_VERSION',
      resourceId: info.pannaCotta.versionId,
      filePath: join(CATALOG_DIR, 'menus', 'premium-celebration', 'mon-panna-cotta-dua-02.webp'),
      alternativeText: 'Cận cảnh ly panna cotta dừa trên đĩa sứ',
      label: 'Món Panna cotta dừa [2/2]',
    },
  ];

  console.log(`\n🚀 Bắt đầu tải lên ${itemsToUpload.length} ảnh theo đúng thứ tự...\n`);
  let successCount = 0;
  for (const item of itemsToUpload) {
    const ok = await uploadAsset(token, item);
    if (ok) successCount++;
  }

  console.log(
    `\n🎉 Hoàn thành: Đã tải lên ${successCount}/${itemsToUpload.length} ảnh thành công!`,
  );
}

main().catch((err) => {
  console.error('❌ Lỗi không xử lý được:', err);
  process.exit(1);
});
