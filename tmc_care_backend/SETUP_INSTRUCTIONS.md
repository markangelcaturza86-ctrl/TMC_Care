# TMC-Care Backend — XAMPP Setup

## 1. Install PHP dependencies
```
composer install
```
(This will pull in `laravel/sanctum`, added to composer.json.)

## 2. Create the database
In phpMyAdmin (http://localhost/phpmyadmin), create a database named:
```
tmc_care
```
(Default `.env` already points to `127.0.0.1:3306`, user `root`, no password — adjust if your XAMPP MySQL differs.)

## 3. Storage link (for file uploads)
```
php artisan storage:link
```

## 4. Migrate + seed
```
php artisan migrate --seed
```

## 5. Run the API
```
php artisan serve
```
API will be available at `http://127.0.0.1:8000/api`.

## Login accounts (all password: `password`)
- admin@tmc.edu.ph — Super Administrator
- ivy.tanocampo@tmc.edu.ph — Case Officer
- edgar.malabanan@tmc.edu.ph — Finance Reviewer
- bartolome.reyes@tmc.edu.ph — Case Officer
- corazon.fajardo@tmc.edu.ph — Front Desk / Encoder (Inactive)

## Notes
- Auth: Laravel Sanctum personal-access tokens (Bearer token), not cookie/session based — simplest to pair with a separately-hosted React frontend.
- File uploads (documents) are stored on the `public` disk (`storage/app/public`), served via the `storage:link` symlink.
- CORS is open (`allowed_origins => ['*']`) for local development — tighten `config/cors.php` before any real deployment.
