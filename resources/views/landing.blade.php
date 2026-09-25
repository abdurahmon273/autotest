<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ config('app.name') }}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css'])
</head>
<body class="font-inter text-gray-900 bg-white">
    <header class="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="/" class="text-2xl font-extrabold tracking-tight">{{ config('app.name') }}</a>
        <a href="{{ route('login') }}" class="rounded-lg bg-[#1e3a8a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af]">Tizimga kirish</a>
    </header>

    <section class="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <h1 class="text-4xl md:text-6xl font-extrabold leading-tight">Yangi avlod<br>ta’lim platformasi</h1>
        <p class="mt-6 text-lg text-gray-500 max-w-xl mx-auto">Avtomaktablar uchun zamonaviy va qulay masofaviy ta’lim tizimi</p>
        <div class="mt-10 flex justify-center gap-4">
            <a href="{{ route('login') }}" class="rounded-xl bg-[#1e3a8a] px-8 py-4 text-base font-semibold text-white hover:bg-[#1e40af]">Tizimga kirish</a>
            <a href="/admin/login" class="rounded-xl border border-gray-200 px-8 py-4 text-base font-semibold text-gray-700 hover:bg-gray-50">Admin</a>
        </div>
        <div class="mt-16 mx-auto max-w-4xl h-72 md:h-96 rounded-3xl bg-gradient-to-br from-[#0f2a5c] to-[#3b5bdb]"></div>
    </section>

    <section class="bg-gray-50 py-20">
        <div class="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            @foreach ([['Ustozlar va studentlar', 'Har bir foydalanuvchi uchun alohida kabinet'], ['Elektron hisob', 'Qog‘oz hujjatlarsiz'], ['Interaktiv qo‘llanmalar', 'Yo‘l harakati qoidalari'], ['Onlayn testlar', '700+ savol']] as [$t, $d])
                <div class="rounded-2xl bg-white p-8 shadow-sm">
                    <p class="text-lg font-bold">{{ $t }}</p>
                    <p class="mt-2 text-sm text-gray-500">{{ $d }}</p>
                </div>
            @endforeach
        </div>
    </section>

    <section class="py-20">
        <div class="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            @foreach ([['Avtomaktablar', $stats['schools']], ['Guruhlar', $stats['groups']], ['Ustozlar', $stats['teachers']], ['Studentlar', $stats['students']]] as [$t, $n])
                <div><p class="text-5xl font-extrabold text-[#1e3a8a]">{{ $n }}</p><p class="mt-2 text-gray-500">{{ $t }}</p></div>
            @endforeach
        </div>
    </section>

    <footer class="border-t border-gray-100 py-8 text-center text-sm text-gray-400">&copy; {{ date('Y') }} {{ config('app.name') }}</footer>
</body>
</html>
