<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kirish · {{ config('app.name') }}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css'])
</head>
<body class="font-inter min-h-screen flex items-center justify-center bg-[#0f2a5c]">
    <form method="POST" action="{{ route('login') }}" class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        @csrf
        <h1 class="text-2xl font-extrabold text-center mb-8">Avtomaktab</h1>
        <input type="text" name="username" value="{{ old('username') }}" placeholder="Foydalanuvchi nomi" autofocus class="form-input mb-4">
        <div class="relative">
            <input type="password" name="password" id="password" placeholder="Parol" class="form-input pr-10">
            <button type="button" tabindex="-1" onclick="togglePassword(this)" aria-label="Parolni ko‘rsatish" class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-700">
                <svg data-eye xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg data-eye-off class="hidden" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
            </button>
        </div>
        <script>
            function togglePassword(btn) {
                const input = document.getElementById('password');
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                btn.querySelector('[data-eye]').classList.toggle('hidden', show);
                btn.querySelector('[data-eye-off]').classList.toggle('hidden', !show);
                btn.setAttribute('aria-label', show ? 'Parolni yashirish' : 'Parolni ko‘rsatish');
            }
        </script>
        @error('username') <p class="mt-2 text-xs text-red-600">{{ $message }}</p> @enderror
        <div class="mt-3 flex items-center justify-end">
            <a href="#" class="text-sm text-gray-500 hover:text-gray-800">Parolni unutdingizmi?</a>
        </div>
        <button type="submit" class="mt-6 w-full rounded-xl bg-[#1e3a8a] py-3 font-semibold text-white hover:bg-[#1e40af]">Tizimga kirish</button>
    </form>
</body>
</html>
