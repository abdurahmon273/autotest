# AutoTest — serverga o‘tkazish

## Talablar
- PHP 8.4 (`gd`, `pdo_mysql`, `mbstring`, `bcmath`, `intl`, `zip`, `fileinfo`)
- MySQL 8 / MariaDB 10.4+
- Composer 2, Node 20+ (faqat build uchun)
- Nginx (yoki Apache), HTTPS (Sanctum cookie uchun shart)

## 1. Kodni yuklash
```bash
git clone <repo> /var/www/autotest && cd /var/www/autotest
composer install --no-dev --optimize-autoloader
npm ci && npm run build      # public/build/ hosil bo‘ladi (yoki lokalda build qilib yuklang)
rm -f public/hot             # dev fayli serverda bo‘lmasligi kerak
```

## 2. `.env`
```bash
cp .env.example .env
php artisan key:generate
```
Majburiy o‘zgartiriladiganlar:
```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://example.uz
APP_LOCALE=uz

DB_CONNECTION=mysql
DB_DATABASE=autotest
DB_USERNAME=...
DB_PASSWORD=...

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SANCTUM_STATEFUL_DOMAINS=example.uz,www.example.uz   # domen(lar), portsiz

SEED_ADMIN_EMAIL=admin@example.uz
SEED_ADMIN_PASSWORD=<kuchli parol>
SEED_TEACHER_PASSWORD=<parol>
SEED_STUDENT_PASSWORD=<parol>
```

## 3. Baza va seed (bir marta)
```bash
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
```
Seed nima yaratadi:
- Rollar: Admin, Teacher, Student; 47 ta ruxsat (Admin roliga hammasi)
- Foydalanuvchilar: `admin` (email = SEED_ADMIN_EMAIL, `/admin/login`), `teacher`, `student` (username + parol, `/login`)
- Tillar: Uzbek (lotin) `latin` — birlamchi, Uzbek (krill) `krill`
- 20 ta asosiy mavzu (lotin + krill nomlari, emoji)
- 3 ta namunaviy savol (2 tasi rasmli), rasmlar `public/backup/images/` dan `storage/app/public/images/` ga ko‘chiriladi
- `global_settings`: birlamchi til, jarima imkoniyatlar soni = 3

`StudentSeeder` (30 ta fake student) faqat `APP_ENV=local` da ishlaydi — serverda ishlamaydi.

To‘liq 71–100 bilet savollari kerak bo‘lsa (237 ta): `php artisan db:seed --class=BiletQuestionsSeeder --force`
(rasmlar `database/seeders/data/images/` dan olinadi).

## 4. Ruxsatlar va kesh
```bash
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
php artisan config:cache && php artisan route:cache && php artisan view:cache
```
Keyingi deploylarda: `git pull && composer install --no-dev && npm run build && php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan view:cache`.

## 5. Nginx (namuna)
```nginx
server {
    listen 443 ssl http2;
    server_name example.uz;
    root /var/www/autotest/public;
    index index.php;
    client_max_body_size 10M;      # rasm yuklash (savol 4MB, mavzu 2MB)

    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    }
    location ~ /\.(?!well-known) { deny all; }
}
```
PHP: `upload_max_filesize=10M`, `post_max_size=12M`.

## 6. Telegram
Admin → Sozlamalar → Telegram sozlamalari → bot token → Saqlash: `https://example.uz/telegram/webhook` ga `setWebhook` yuboriladi (faqat HTTPS domenida ishlaydi). Webhook handler hozircha bo‘sh (`204`).

## 7. Tekshirish
- `https://example.uz/` — landing
- `https://example.uz/admin/login` — admin (email + parol)
- `https://example.uz/login` — student/teacher (username + parol)
- `https://example.uz/app` — foydalanuvchi qismi (mavzu testlari)
- `curl -I https://example.uz/up` → 200

## Eslatmalar
- `public/backup/` — seed uchun rasmlar/ikonkalar; git’da saqlanadi, o‘chirmang.
- `storage/app/public/` (yuklangan rasmlar) — backup’ga kiritilishi kerak, git’da emas.
- Sanctum cookie auth: `SANCTUM_STATEFUL_DOMAINS` da domen noto‘g‘ri bo‘lsa admin/user API `401` qaytaradi.
- Baza backup: `mysqldump autotest > backup.sql` (cron bilan kunlik tavsiya etiladi).
