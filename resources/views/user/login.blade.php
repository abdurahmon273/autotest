<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kirish · {{ config('app.name') }}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css'])
</head>
<body class="font-inter min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0f2a5c] to-[#3b5bdb]">
    <form method="POST" action="{{ route('login') }}" class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        @csrf
        <h1 class="text-2xl font-extrabold text-center mb-8">Avtomaktab</h1>
        <input type="text" name="username" value="{{ old('username') }}" placeholder="Foydalanuvchi nomi" autofocus class="form-input mb-4">
        <input type="password" name="password" placeholder="Parol" class="form-input">
        @error('username') <p class="mt-2 text-xs text-red-600">{{ $message }}</p> @enderror
        <div class="mt-3 text-right"><a href="#" class="text-sm text-gray-500 hover:text-gray-800">Parolni unutdingizmi?</a></div>
        <button type="submit" class="mt-6 w-full rounded-xl bg-[#1e3a8a] py-3 font-semibold text-white hover:bg-[#1e40af]">Tizimga kirish</button>
    </form>
</body>
</html>
